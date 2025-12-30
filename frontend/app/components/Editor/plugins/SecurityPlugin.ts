import { EditorView, KeyBinding, keymap } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { SecurityOptions } from "../types";

/**
 * Implements anti-cheat and editor security restrictions.
 */
export function securityPlugin(options: SecurityOptions, onCheat?: (reason: string) => void): Extension {
    const extensions: Extension[] = [];

    // Handle Event-based restrictions
    const eventHandler = EditorView.domEventHandlers({
        paste(event, view) {
            if (options.disablePaste) {
                event.preventDefault();
                onCheat?.("Paste attempt blocked");
                return true;
            }
        },
        copy(event, view) {
            if (options.disableCopy) {
                event.preventDefault();
                onCheat?.("Copy attempt blocked");
                return true;
            }
        },
        cut(event, view) {
            if (options.disableCut) {
                event.preventDefault();
                onCheat?.("Cut attempt blocked");
                return true;
            }
        },
        drop(event, view) {
            if (options.disableDragDrop) {
                event.preventDefault();
                onCheat?.("Drag and drop attempt blocked");
                return true;
            }
        },
        contextmenu(event, view) {
            if (options.disableRightClick) {
                event.preventDefault();
                return true;
            }
        }
    });

    extensions.push(eventHandler);

    // Handle Keyboard-based restrictions
    const customKeybindings: KeyBinding[] = [];

    if (options.disableUndoRedo) {
        // Override common undo/redo combos
        customKeybindings.push(
            { key: "Mod-z", run: () => true, preventDefault: true },
            { key: "Mod-y", run: () => true, preventDefault: true },
            { key: "Mod-Shift-z", run: () => true, preventDefault: true }
        );
    }

    if (options.disableCopy || options.disablePaste || options.disableCut) {
        if (options.disableCopy) customKeybindings.push({ key: "Mod-c", run: () => true, preventDefault: true });
        if (options.disablePaste) customKeybindings.push({ key: "Mod-v", run: () => true, preventDefault: true });
        if (options.disableCut) customKeybindings.push({ key: "Mod-x", run: () => true, preventDefault: true });
    }

    if (customKeybindings.length > 0) {
        extensions.push(keymap.of(customKeybindings));
    }

    return extensions;
}
