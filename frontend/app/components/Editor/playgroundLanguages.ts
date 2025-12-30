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
        initialBody: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
        extension: async () => cpp(),
    },
    {
        id: "javascript",
        label: "JavaScript",
        header: "",
        footer: "",
        initialBody: `console.log("Hello Playgound!");\n\nconst greet = (name) => {\n    return \`Hello, \${name}!\`;\n};\n\nconsole.log(greet("Antigravity"));`,
        extension: async () => javascript(),
    },
    {
        id: "python",
        label: "Python",
        header: "",
        footer: "",
        initialBody: `def hello():\n    print("Hello from Python Playground!")\n\nif __name__ == "__main__":\n    hello()`,
        extension: async () => python(),
    },
    {
        id: "java",
        label: "Java",
        header: "",
        footer: "",
        initialBody: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Java!");\n    }\n}`,
        extension: async () => java(),
    }
];
