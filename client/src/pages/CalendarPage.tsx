import { useEffect, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Flame, Calendar, Clock, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { api } from '../api/client';

interface DayData {
  date: string;
  sessions: number;
  minutes: number;
  rating: string | null;
}

interface StreakData {
  current_streak: number;
  longest_streak: number;
  total_practice_days: number;
  total_hours: number;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getIntensity(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes < 20) return 1;
  if (minutes < 45) return 2;
  if (minutes < 90) return 3;
  return 4;
}

const INTENSITY_COLORS = [
  'var(--pf-bg-hover)',           // 0: no practice
  'var(--pf-accent-gold)',        // 1: light
  'var(--pf-accent-gold)',        // 2: moderate
  'var(--pf-accent-gold)',        // 3: solid
  'var(--pf-accent-gold)',        // 4: heavy
];

const INTENSITY_OPACITY = [0.08, 0.25, 0.5, 0.75, 1.0];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export function CalendarPage() {
  const [calendarData, setCalendarData] = useState<DayData[]>([]);
  const [streaks, setStreaks] = useState<StreakData | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  useEffect(() => {
    api.getAnalyticsCalendar(12).then(setCalendarData).catch(() => {});
    api.getAnalyticsStreaks().then(setStreaks).catch(() => {});
  }, []);

  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>();
    for (const d of calendarData) map.set(d.date, d);
    return map;
  }, [calendarData]);

  const navigate = (delta: number) => {
    setViewDate(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
    setSelectedDay(null);
  };

  const goToToday = () => {
    const now = new Date();
    setViewDate({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedDay(null);
  };

  const { year, month } = viewDate;
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Build calendar grid
  const cells: Array<{ date: string; day: number } | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null); // leading blanks
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ date: dateStr, day: d });
  }

  // Monthly totals
  const monthDays = calendarData.filter(d => {
    return d.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
  });
  const monthMinutes = monthDays.reduce((s, d) => s + d.minutes, 0);
  const monthSessions = monthDays.reduce((s, d) => s + d.sessions, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Practice Calendar</h1>

      {/* Streak stats */}
      {streaks && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-full bg-[var(--pf-accent-gold)]/10 flex items-center justify-center">
                <Flame size={18} className="text-[var(--pf-accent-gold)]" />
              </div>
              <div>
                <p className="text-2xl font-bold">{streaks.current_streak}</p>
                <p className="text-xs text-[var(--pf-text-secondary)]">Day streak</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-full bg-[var(--pf-accent-blue, #3b82f6)]/10 flex items-center justify-center">
                <Trophy size={18} style={{ color: 'var(--pf-accent-blue, #3b82f6)' }} />
              </div>
              <div>
                <p className="text-2xl font-bold">{streaks.longest_streak}</p>
                <p className="text-xs text-[var(--pf-text-secondary)]">Best streak</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-full bg-[var(--pf-status-ready)]/10 flex items-center justify-center">
                <Calendar size={18} style={{ color: 'var(--pf-status-ready)' }} />
              </div>
              <div>
                <p className="text-2xl font-bold">{streaks.total_practice_days}</p>
                <p className="text-xs text-[var(--pf-text-secondary)]">Total days</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-full bg-[var(--pf-accent-purple, #9b59b6)]/10 flex items-center justify-center">
                <Clock size={18} style={{ color: 'var(--pf-accent-purple, #9b59b6)' }} />
              </div>
              <div>
                <p className="text-2xl font-bold">{streaks.total_hours}</p>
                <p className="text-xs text-[var(--pf-text-secondary)]">Total hours</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
                  <ChevronLeft size={16} />
                </Button>
                <h2 className="text-lg font-semibold min-w-[180px] text-center">
                  {MONTH_NAMES[month]} {year}
                </h2>
                <Button variant="ghost" size="sm" onClick={() => navigate(1)}>
                  <ChevronRight size={16} />
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAY_LABELS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-[var(--pf-text-secondary)] py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1">
              {cells.map((cell, i) => {
                if (!cell) return <div key={`blank-${i}`} />;

                const data = dayMap.get(cell.date);
                const intensity = data ? getIntensity(data.minutes) : 0;
                const isToday = cell.date === todayStr;
                const isSelected = selectedDay?.date === cell.date;
                const isFuture = cell.date > todayStr;

                return (
                  <button
                    key={cell.date}
                    onClick={() => setSelectedDay(data || { date: cell.date, sessions: 0, minutes: 0, rating: null })}
                    disabled={isFuture}
                    className={`aspect-square rounded-pf-sm flex flex-col items-center justify-center text-sm transition-all relative ${
                      isSelected
                        ? 'ring-2 ring-[var(--pf-accent-gold)]'
                        : ''
                    } ${isFuture ? 'opacity-30 cursor-default' : 'cursor-pointer hover:ring-1 hover:ring-[var(--pf-border-color)]'}`}
                    style={{
                      backgroundColor: intensity > 0
                        ? INTENSITY_COLORS[intensity]
                        : 'var(--pf-bg-hover)',
                      opacity: isFuture ? 0.3 : (intensity > 0 ? INTENSITY_OPACITY[intensity] : 0.4),
                    }}
                  >
                    <span className={`text-xs font-medium ${
                      isToday ? 'text-[var(--pf-accent-gold)]' : 'text-[var(--pf-text-primary)]'
                    }`}>
                      {cell.day}
                    </span>
                    {data && data.minutes > 0 && (
                      <span className="text-[10px] text-[var(--pf-text-primary)] font-medium mt-0.5">
                        {data.minutes < 60 ? `${data.minutes}m` : `${(data.minutes / 60).toFixed(1)}h`}
                      </span>
                    )}
                    {isToday && (
                      <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[var(--pf-accent-gold)]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--pf-border-color)]">
              <span className="text-xs text-[var(--pf-text-secondary)]">Less</span>
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map(level => (
                  <div
                    key={level}
                    className="w-4 h-4 rounded-sm"
                    style={{
                      backgroundColor: level > 0 ? INTENSITY_COLORS[level] : 'var(--pf-bg-hover)',
                      opacity: INTENSITY_OPACITY[level],
                    }}
                  />
                ))}
              </div>
              <span className="text-xs text-[var(--pf-text-secondary)]">More</span>
            </div>
          </CardContent>
        </Card>

        {/* Day detail + month summary */}
        <div className="space-y-4">
          {/* Month summary */}
          <Card>
            <CardHeader>
              <h3 className="text-sm font-semibold">{MONTH_NAMES[month]} Summary</h3>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--pf-text-secondary)]">Sessions</span>
                <span className="font-medium">{monthSessions}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--pf-text-secondary)]">Practice days</span>
                <span className="font-medium">{monthDays.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[var(--pf-text-secondary)]">Total time</span>
                <span className="font-medium">
                  {monthMinutes < 60 ? `${monthMinutes}m` : `${(monthMinutes / 60).toFixed(1)}h`}
                </span>
              </div>
              {monthDays.length > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--pf-text-secondary)]">Avg per day</span>
                  <span className="font-medium">{Math.round(monthMinutes / monthDays.length)}m</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected day detail */}
          {selectedDay && (
            <Card borderColor={selectedDay.minutes > 0 ? 'var(--pf-accent-gold)' : undefined}>
              <CardHeader>
                <h3 className="text-sm font-semibold">
                  {new Date(selectedDay.date + 'T12:00:00').toLocaleDateString('en-AU', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </h3>
              </CardHeader>
              <CardContent>
                {selectedDay.minutes > 0 ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--pf-text-secondary)]">Sessions</span>
                      <span className="font-medium">{selectedDay.sessions}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[var(--pf-text-secondary)]">Duration</span>
                      <span className="font-medium">
                        {selectedDay.minutes < 60
                          ? `${selectedDay.minutes} minutes`
                          : `${(selectedDay.minutes / 60).toFixed(1)} hours`}
                      </span>
                    </div>
                    {selectedDay.rating && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--pf-text-secondary)]">Rating</span>
                        <span className={`font-medium capitalize ${
                          selectedDay.rating === 'good' ? 'text-[var(--pf-status-ready)]' :
                          selectedDay.rating === 'bad' ? 'text-[var(--pf-status-needs-work)]' :
                          'text-[var(--pf-text-primary)]'
                        }`}>
                          {selectedDay.rating}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--pf-text-secondary)]">No practice recorded</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
