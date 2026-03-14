import { useEffect } from 'react';

/**
 * Locks body scroll when a modal/overlay is open.
 * Cleans up on close or unmount.
 */
export function useModalLock(isOpen: boolean) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
}
