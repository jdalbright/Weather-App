"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const CLOSE_DURATION_MS = 320;

type CollapsiblePanelProps = {
    open: boolean;
    className?: string;
    innerClassName?: string;
    children: ReactNode;
};

function joinClasses(...values: Array<string | undefined | false>) {
    return values.filter(Boolean).join(" ");
}

export default function CollapsiblePanel({
    open,
    className,
    innerClassName,
    children,
}: CollapsiblePanelProps) {
    const [shouldRender, setShouldRender] = useState(open);
    const [renderState, setRenderState] = useState<"open" | "closed">(open ? "open" : "closed");
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const openFrameRef = useRef<number | null>(null);
    const visibleFrameRef = useRef<number | null>(null);

    useEffect(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }

        if (openFrameRef.current != null) {
            cancelAnimationFrame(openFrameRef.current);
            openFrameRef.current = null;
        }

        if (visibleFrameRef.current != null) {
            cancelAnimationFrame(visibleFrameRef.current);
            visibleFrameRef.current = null;
        }

        if (open && !shouldRender) {
            openFrameRef.current = requestAnimationFrame(() => {
                setShouldRender(true);
                openFrameRef.current = null;
            });
        } else if (open) {
            visibleFrameRef.current = requestAnimationFrame(() => {
                setRenderState("open");
                visibleFrameRef.current = null;
            });
        } else if (shouldRender) {
            visibleFrameRef.current = requestAnimationFrame(() => {
                setRenderState("closed");
                visibleFrameRef.current = null;
            });
            closeTimerRef.current = setTimeout(() => {
                setShouldRender(false);
                closeTimerRef.current = null;
            }, CLOSE_DURATION_MS);
        }

        return () => {
            if (closeTimerRef.current) {
                clearTimeout(closeTimerRef.current);
                closeTimerRef.current = null;
            }

            if (openFrameRef.current != null) {
                cancelAnimationFrame(openFrameRef.current);
                openFrameRef.current = null;
            }

            if (visibleFrameRef.current != null) {
                cancelAnimationFrame(visibleFrameRef.current);
                visibleFrameRef.current = null;
            }
        };
    }, [open, shouldRender]);

    if (!shouldRender) return null;

    return (
        <div
            className={joinClasses(
                "collapsible-panel",
                renderState === "open" ? "collapsible-panel--open" : "collapsible-panel--closed",
                className
            )}
            aria-hidden={!open}
        >
            <div className={joinClasses("collapsible-panel__inner", innerClassName)}>
                {children}
            </div>
        </div>
    );
}
