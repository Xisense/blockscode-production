import { Extension } from "@codemirror/state";

export type LanguageID = "javascript" | "python" | "java" | "cpp" | "c" | "python-notebook";

export interface LanguageConfig {
    id: LanguageID;
    label: string;
    header: string;
    initialBody: string;
    footer: string;
    extension: () => Promise<Extension>;
}

export interface SecurityOptions {
    disableCopy?: boolean;
    disablePaste?: boolean;
    disableCut?: boolean;
    disableRightClick?: boolean;
    disableUndoRedo?: boolean;
    disableMultiCursor?: boolean;
    disableDragDrop?: boolean;
    readOnly?: boolean;
}

export interface EditorActions {
    onBlur?: () => void;
    onFocus?: () => void;
    onCheatDetected?: (reason: string) => void;
    onChange?: (body: string) => void;
    onRun?: () => void;
    onSubmit?: (body: string) => void;
}

export interface CodeEditorProps {
    language: LanguageConfig;
    options?: SecurityOptions;
    actions?: EditorActions;
    className?: string;
    height?: string;
    isExecuting?: boolean;
    hideLanguageSelector?: boolean;
    hideTopBar?: boolean;
    hideRunBar?: boolean;
    customToolbarContent?: React.ReactNode;
    fontSize?: number;
    // Test cases provided by the question (optional)
    testCases?: Array<any>;
}
