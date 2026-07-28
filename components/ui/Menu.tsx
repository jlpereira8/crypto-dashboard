import React, { useCallback, useId, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";
import { popover, transition, withReducedMotion } from "../../lib/motion";
import { useClickOutside, useEscapeKey } from "../../lib/useOverlay";

export interface MenuItemDef {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  /** Navigates. Mutually exclusive with `onSelect`. */
  href?: string;
  onSelect?: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
}

export interface MenuGroupDef {
  label?: string;
  items: MenuItemDef[];
}

export interface MenuProps {
  /** Rendered as the trigger. Receives the open state for styling. */
  renderTrigger: (props: {
    ref: React.Ref<HTMLButtonElement>;
    open: boolean;
    onClick: () => void;
    onKeyDown: (event: React.KeyboardEvent) => void;
    "aria-haspopup": "menu";
    "aria-expanded": boolean;
    "aria-controls": string | undefined;
    id: string;
  }) => React.ReactNode;
  groups: MenuGroupDef[];
  align?: "start" | "end";
  className?: string;
}

/**
 * Dropdown menu following the WAI-ARIA menu-button pattern.
 *
 * Down/Up on the closed trigger opens it focused on the first/last item; arrows
 * cycle; Home/End jump; Escape closes and returns focus to the trigger. Focus is
 * moved imperatively via refs (roving focus) rather than tracked in state, which
 * is what screen readers follow.
 */
export function Menu({ renderTrigger, groups, align = "end", className }: MenuProps) {
  const [open, setOpen] = useState(false);
  const baseId = useId();
  const menuId = `${baseId}-menu`;
  const triggerId = `${baseId}-trigger`;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const reduced = useReducedMotion() ?? false;

  const flatItems = groups.flatMap((group) => group.items);
  const enabledIndexes = flatItems.reduce<number[]>((acc, item, index) => {
    if (!item.disabled) acc.push(index);
    return acc;
  }, []);

  const close = useCallback(
    (returnFocus = true) => {
      setOpen(false);
      if (returnFocus) triggerRef.current?.focus();
    },
    [],
  );

  useEscapeKey(open, () => close());
  useClickOutside(open, [panelRef, triggerRef], () => close(false));

  const focusItemAt = useCallback((position: number) => {
    const target = enabledIndexes[(position + enabledIndexes.length) % enabledIndexes.length];
    // Wait for the panel to mount before reaching for the node.
    requestAnimationFrame(() => itemRefs.current[target]?.focus());
  }, [enabledIndexes]);

  const onTriggerKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        setOpen(true);
        focusItemAt(0);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setOpen(true);
        focusItemAt(enabledIndexes.length - 1);
      }
    },
    [focusItemAt, enabledIndexes.length],
  );

  const onPanelKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const currentIndex = itemRefs.current.indexOf(document.activeElement as HTMLElement);
      const currentPosition = enabledIndexes.indexOf(currentIndex);

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          focusItemAt(currentPosition + 1);
          break;
        case "ArrowUp":
          event.preventDefault();
          focusItemAt(currentPosition - 1);
          break;
        case "Home":
          event.preventDefault();
          focusItemAt(0);
          break;
        case "End":
          event.preventDefault();
          focusItemAt(enabledIndexes.length - 1);
          break;
        case "Tab":
          // Menus are not part of the tab sequence: Tab dismisses.
          close(false);
          break;
      }
    },
    [close, enabledIndexes, focusItemAt],
  );

  let itemIndex = -1;

  return (
    <div className={cn("relative", className)}>
      {renderTrigger({
        ref: triggerRef,
        open,
        onClick: () => setOpen((value) => !value),
        onKeyDown: onTriggerKeyDown,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
        id: triggerId,
      })}

      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            onKeyDown={onPanelKeyDown}
            className={cn(
              "absolute top-full z-50 mt-1.5 min-w-[13rem] rounded-xl p-1",
              "bg-surface shadow-pop ring-1 ring-line",
              align === "end" ? "right-0" : "left-0",
            )}
            variants={popover}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={withReducedMotion(transition.fast, reduced)}
          >
            {groups.map((group, groupIndex) => (
              <div
                key={group.label ?? groupIndex}
                role="group"
                aria-label={group.label}
                className={groupIndex > 0 ? "mt-1 border-t border-line pt-1" : undefined}
              >
                {group.label && (
                  <p className="px-2 py-1.5 text-2xs font-medium uppercase text-ink-muted">
                    {group.label}
                  </p>
                )}
                {group.items.map((item) => {
                  itemIndex += 1;
                  return (
                    <MenuItem
                      key={item.id}
                      item={item}
                      index={itemIndex}
                      itemRefs={itemRefs}
                      onDone={() => close(false)}
                    />
                  );
                })}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  item,
  index,
  itemRefs,
  onDone,
}: {
  item: MenuItemDef;
  index: number;
  itemRefs: React.MutableRefObject<(HTMLElement | null)[]>;
  onDone: () => void;
}) {
  const classes = cn(
    "focus-ring flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm",
    "transition-colors duration-fast",
    item.disabled
      ? "pointer-events-none opacity-40"
      : item.tone === "danger"
        ? "text-negative hover:bg-negative-soft"
        : "text-ink-secondary hover:bg-surface-subtle hover:text-ink",
  );

  const body = (
    <>
      {item.icon && (
        <span aria-hidden="true" className="mt-0.5 shrink-0 text-ink-muted">
          {item.icon}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-medium">{item.label}</span>
        {item.description && (
          <span className="mt-0.5 block text-xs text-ink-muted">{item.description}</span>
        )}
      </span>
    </>
  );

  const assignRef = (el: HTMLElement | null) => {
    itemRefs.current[index] = el;
  };

  if (item.href) {
    return (
      <Link
        ref={assignRef as React.Ref<HTMLAnchorElement>}
        href={item.href}
        role="menuitem"
        tabIndex={-1}
        className={classes}
        onClick={onDone}
      >
        {body}
      </Link>
    );
  }

  return (
    <button
      ref={assignRef as React.Ref<HTMLButtonElement>}
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={item.disabled}
      className={classes}
      onClick={() => {
        item.onSelect?.();
        onDone();
      }}
    >
      {body}
    </button>
  );
}
