import { Router } from 'express';
import { queryAll, queryOne, execute } from '../db/helpers.js';
import { v4 as uuid } from 'uuid';
import { callOmr, callAnalysis, callClaudeEnhance, callEstimateCost } from '../utils/analysisClient.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', '..', 'data');

const router = Router();

// POST — trigger OMR processing for a file
router.post('/trigger-omr/:fileId', async (req, res) => {
  try {
    const file = await queryOne('SELECT * FROM uploaded_files WHERE id = $1', [req.params.fileId]);
    if (!file) return res.status(404).json({ error: 'File not found' });

    const filePath = path.resolve(DATA_DIR, file.file_path);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });

    // Update status to processing
    await execute('UPDATE uploaded_files SET processing_status = $1 WHERE id = $2', ['processing', file.id]);

    const fileBuffer = fs.readFileSync(filePath);
    const omrId = uuid();

    try {
      const result = await callOmr(fileBuffer, file.original_filename);

      // Save MusicXML content to scores directory
      const scoresDir = path.resolve(DATA_DIR, 'scores');
      if (!fs.existsSync(scoresDir)) fs.mkdirSync(scoresDir, { recursive: true });

      const xmlPath = `scores/${file.id}.xml`;
      fs.writeFileSync(path.resolve(DATA_DIR, xmlPath), result.musicxml_content || '');

      await execute(
        `INSERT INTO omr_results (id, file_id, musicxml_path, confidence, page_count, measure_count, extracted_title, extracted_composer, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [omrId, file.id, xmlPath, result.confidence, result.page_count, result.measure_count, result.extracted_title, result.extracted_composer]
      );

      await execute('UPDATE uploaded_files SET processing_status = $1 WHERE id = $2', ['needs_review', file.id]);

      const omrResult = await queryOne('SELECT * FROM omr_results WHERE id = $1', [omrId]);
      res.json(omrResult);
    } catch (omrErr) {
      await execute(
        `INSERT INTO omr_results (id, file_id, error_message, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())`,
        [omrId, file.id, omrErr.message]
      );
      await execute('UPDATE uploaded_files SET processing_status = $1 WHERE id = $2', ['failed', file.id]);

      const omrResult = await queryOne('SELECT * FROM omr_results WHERE id = $1', [omrId]);
      res.status(500).json(omrResult);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — trigger analysis for a file
router.post('/trigger-analysis/:fileId', async (req, res) => {
  try {
    const file = await queryOne('SELECT * FROM uploaded_files WHERE id = $1', [req.params.fileId]);
    if (!file) return res.status(404).json({ error: 'File not found' });

    let musicxmlContent;
    let omrResultId = null;

    if (file.file_type === 'sheet_music_digital') {
      // Digital sheet music — read MusicXML directly
      const filePath = path.resolve(DATA_DIR, file.file_path);
      if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' });
      musicxmlContent = fs.readFileSync(filePath, 'utf-8');
    } else {
      // Scanned sheet music — get MusicXML from OMR result
      const omr = await queryOne('SELECT * FROM omr_results WHERE file_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.fileId]);
      if (!omr || !omr.musicxml_path) return res.status(400).json({ error: 'No MusicXML available. Run OMR first.' });
      omrResultId = omr.id;

      const xmlPath = path.resolve(DATA_DIR, omr.musicxml_path);
      if (!fs.existsSync(xmlPath)) return res.status(404).json({ error: 'MusicXML file not found on disk' });
      musicxmlContent = fs.readFileSync(xmlPath, 'utf-8');
    }

    const result = await callAnalysis(musicxmlContent);
    const analysisId = uuid();

    await execute(
      `INSERT INTO analysis_results (id, file_id, omr_result_id, analysis_type, key_signature, time_signature, tempo_marking, difficulty_estimate, register_low, register_high, total_measures, analysis_data, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'complete', NOW(), NOW())`,
      [
        analysisId, file.id, omrResultId, result.analysis_type || 'full',
        result.key_signature, result.time_signature, result.tempo_marking,
        result.difficulty_estimate, result.register_low, result.register_high,
        result.total_measures, JSON.stringify(result.analysis_data || {}),
      ]
    );

    // Insert demands
    if (result.demands && Array.isArray(result.demands)) {
      for (const demand of result.demands) {
        const demandId = uuid();
        await execute(
          `INSERT INTO analysis_demands (id, analysis_id, description, category_id, difficulty, bar_range, confidence, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
          [demandId, analysisId, demand.description, demand.category_id || null, demand.difficulty, demand.bar_range, demand.confidence]
        );
      }
    }

    const analysisResult = await queryOne('SELECT * FROM analysis_results WHERE id = $1', [analysisId]);
    const demands = await queryAll('SELECT * FROM analysis_demands WHERE analysis_id = $1', [analysisId]);
    res.json({ ...analysisResult, demands });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST — trigger Claude enhancement for an analysis
router.post('/trigger-claude/:analysisId', async (req, res) => {
  try {
    const analysis = await queryOne('SELECT * FROM analysis_results WHERE id = $1', [req.params.analysisId]);
    if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

    // Get MusicXML content
    let musicxmlContent;
    const file = await queryOne('SELECT * FROM uploaded_files WHERE id = $1', [analysis.file_id]);

    if (file.file_type === 'sheet_music_digital') {
      const filePath = path.resolve(DATA_DIR, file.file_path);
      musicxmlContent = fs.readFileSync(filePath, 'utf-8');
    } else {
      const omr = await queryOne('SELECT * FROM omr_results WHERE file_id = $1 ORDER BY created_at DESC LIMIT 1', [analysis.file_id]);
      if (!omr || !omr.musicxml_path) return res.status(400).json({ error: 'No MusicXML available' });
      musicxmlContent = fs.readFileSync(path.resolve(DATA_DIR, omr.musicxml_path), 'utf-8');
    }

    const basicAnalysis = analysis.analysis_data;

    // If not confirmed, return cost estimate
    if (req.body.confirmed !== true) {
      const estimate = await callEstimateCost(musicxmlContent, basicAnalysis);
      return res.json({ estimated_cost: estimate.estimated_cost, requires_confirmation: true });
    }

    // Confirmed — run Claude enhancement
    const result = await callClaudeEnhance(musicxmlContent, basicAnalysis);

    await execute(
      'UPDATE analysis_results SET claude_analysis = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(result.claude_analysis || result), req.params.analysisId]
    );

    // Track AI spend
    if (result.cost) {
      const existing = await queryOne("SELECT * FROM settings WHERE key = 'ai_spend_total'");
      if (existing) {
        const newTotal = parseFloat(existing.value) + result.cost;
        await execute("UPDATE settings SET value = $1, updated_at = NOW() WHERE key = 'ai_spend_total'", [String(newTotal)]);
      } else {
        await execute("INSERT INTO settings (key, value, updated_at) VALUES ('ai_spend_total', $1, NOW())", [String(result.cost)]);
      }
    }

    const updated = await queryOne('SELECT * FROM analysis_results WHERE id = $1', [req.params.analysisId]);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — OMR result for a file
router.get('/omr/:fileId', async (req, res) => {
  const omr = await queryOne('SELECT * FROM omr_results WHERE file_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.fileId]);
  if (!omr) return res.status(404).json({ error: 'No OMR result found' });
  res.json(omr);
});

// GET — analysis result for a file
router.get('/results/:fileId', async (req, res) => {
  const analysis = await queryOne('SELECT * FROM analysis_results WHERE file_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.fileId]);
  if (!analysis) return res.status(404).json({ error: 'No analysis result found' });
  res.json(analysis);
});

// GET — demands for an analysis
router.get('/demands/:analysisId', async (req, res) => {
  const demands = await queryAll('SELECT * FROM analysis_demands WHERE analysis_id = $1', [req.params.analysisId]);
  res.json(demands);
});

// POST — import a demand into technical_demands
router.post('/demands/:demandId/import', async (req, res) => {
  try {
    const demand = await queryOne('SELECT * FROM analysis_demands WHERE id = $1', [req.params.demandId]);
    if (!demand) return res.status(404).json({ error: 'Demand not found' });

    const { piece_id } = req.body;
    if (!piece_id) return res.status(400).json({ error: 'piece_id is required' });

    const newId = uuid();
    await execute(
      `INSERT INTO technical_demands (id, piece_id, description, category_id, difficulty, bar_range, auto_detected, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())`,
      [newId, piece_id, demand.description, demand.category_id, demand.difficulty, demand.bar_range]
    );

    await execute(
      'UPDATE analysis_demands SET imported = TRUE, imported_demand_id = $1 WHERE id = $2',
      [newId, req.params.demandId]
    );

    const newDemand = await queryOne('SELECT * FROM technical_demands WHERE id = $1', [newId]);
    res.json(newDemand);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET — combined status for a file
router.get('/status/:fileId', async (req, res) => {
  const file = await queryOne('SELECT * FROM uploaded_files WHERE id = $1', [req.params.fileId]);
  if (!file) return res.status(404).json({ error: 'File not found' });

  const omr = await queryOne('SELECT * FROM omr_results WHERE file_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.fileId]);
  const analysis = await queryOne('SELECT * FROM analysis_results WHERE file_id = $1 ORDER BY created_at DESC LIMIT 1', [req.params.fileId]);

  res.json({ file, omr: omr || null, analysis: analysis || null });
});

export default router;
