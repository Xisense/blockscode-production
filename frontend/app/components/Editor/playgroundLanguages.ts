import { LanguageConfig } from "./types";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";

export const PLAYGROUND_LANGUAGES: LanguageConfig[] = [
    {
        id: "cpp",
        label: "C++",
        header: "",
        footer: "",
        initialBody: `// Write your C++ code here...`,
        extension: async () => cpp(),
    },
    {
        id: "javascript",
        label: "JavaScript",
        header: "",
        footer: "",
        initialBody: `// Write your JavaScript code here...`,
        extension: async () => javascript(),
    },
    {
        id: "python",
        label: "Python",
        header: "",
        footer: "",
        initialBody: `# Write your Python code here...`,
        extension: async () => python(),
    },
    {
        id: "java",
        label: "Java",
        header: "",
        footer: "",
        initialBody: `// Write your Java code here...\n\npublic class Main {\n    public static void main(String[] args) {\n        \n    }\n}`,
        extension: async () => java(),
    }
];
