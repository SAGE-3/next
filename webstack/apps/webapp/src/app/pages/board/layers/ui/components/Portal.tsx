//
// Adapted from https://github.com/alex-cory/react-useportal
//

import { useState, useRef, useEffect, useCallback, ReactNode, SyntheticEvent, MutableRefObject } from 'react';
import { createPortal } from 'react-dom';

type HTMLElRef = MutableRefObject<HTMLElement>;
type CustomEvent = {
  event?: SyntheticEvent<any, Event>;
  portal: HTMLElRef;
  targetEl: HTMLElRef;
} & SyntheticEvent<any, Event>;

type CustomEventHandler = (customEvent: CustomEvent) => void;


export type UsePortalOptions = {
  closeOnOutsideClick?: boolean;
  closeOnEsc?: boolean;
  isOpen?: boolean;
  onOpen?: CustomEventHandler;
  onClose?: CustomEventHandler;
  onPortalClick?: CustomEventHandler;
};


export function usePortal({
  closeOnOutsideClick = true,
  closeOnEsc = true,
  isOpen: defaultIsOpen = false,
  onOpen,
  onClose,
  onPortalClick,
}: UsePortalOptions = {}) {
  const [isOpen, makeOpen] = useState(defaultIsOpen);
  // We use this ref because `isOpen` is stale for handleOutsideMouseClick
  const open = useRef(isOpen);

  const setOpen = useCallback((v: boolean) => {
    // Workaround to not have stale `isOpen` in the handleOutsideMouseClick
    open.current = v;
    makeOpen(v);
  }, [])

  // This is the element you are clicking/hovering/whatever, to trigger opening the portal
  const targetEl = useRef<HTMLElement>();// as HTMLElRef;
  const portal = useRef(document.createElement('div')); // as HTMLElRef;

  useEffect(() => {
    if (!portal.current) portal.current = document.createElement('div')
  }, [portal])

  const createCustomEvent = (e: any) => {
    if (!e) return { portal, targetEl, event: e }
    const event = e || {};
    if (event.persist) event.persist();
    event.portal = portal;
    event.targetEl = targetEl;
    event.event = e;
    const { currentTarget } = e;
    if (!targetEl.current && currentTarget && currentTarget !== document) targetEl.current = event.currentTarget;
    return event;
  };

  const openPortal = useCallback((e: any) => {
    const customEvent = createCustomEvent(e);
    if (onOpen) onOpen(customEvent);
    setOpen(true);
  }, [portal, setOpen, targetEl, onOpen])

  const closePortal = useCallback((e: any) => {
    const customEvent = createCustomEvent(e)
    if (onClose && open.current) onClose(customEvent)
    if (open.current) setOpen(false)
  }, [onClose, setOpen])

  const togglePortal = useCallback((e: SyntheticEvent<any, Event>): void =>
    open.current ? closePortal(e) : openPortal(e),
    [closePortal, openPortal]
  )

  const handleKeydown = useCallback((e: KeyboardEvent): void =>
    (e.key === 'Escape' && closeOnEsc) ? closePortal(e) : undefined,
    [closeOnEsc, closePortal]
  );

  const handleOutsideMouseClick = useCallback((e: MouseEvent) => {
    const containsTarget = (target: HTMLElement) => target.contains(e.target as Node);
    // There might not be a targetEl if the portal was opened programmatically.
    if (containsTarget(portal.current) || (e as any).button !== 0 || !open.current || (targetEl.current && containsTarget(targetEl.current))) return;
    if (closeOnOutsideClick) closePortal(e);
  }, [closePortal, closeOnOutsideClick, portal]);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!portal.current) return;
    const customEvent = createCustomEvent(e);
    if (portal.current.contains(customEvent.target) && onPortalClick) onPortalClick(customEvent);
    handleOutsideMouseClick(e);
  }, [handleOutsideMouseClick])

  useEffect(() => {
    if (!portal.current) return;

    const node = portal.current;
    document.body.appendChild(portal.current)
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('mousedown', handleMouseDown);

    return () => {
      document.removeEventListener('keydown', handleKeydown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.body.removeChild(node);
    }
  }, [handleOutsideMouseClick, handleKeydown, portal]);

  const Portal = useCallback(({ children }: { children: ReactNode }) => {
    if (portal.current != null) return createPortal(children, portal.current);
    return null;
  }, [portal]);

  return {
    isOpen: open.current,
    openPortal,
    ref: targetEl,
    closePortal,
    togglePortal,
    Portal,
    portalRef: portal,
  };
}