import { LanguageConfig } from "./types";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { java } from "@codemirror/lang-java";
import { rust } from "@codemirror/lang-rust";
import { go } from "@codemirror/lang-go";
import { php } from "@codemirror/lang-php";
import { sql } from "@codemirror/lang-sql";
import { StreamLanguage } from "@codemirror/language";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { shell } from "@codemirror/legacy-modes/mode/shell";
import { perl } from "@codemirror/legacy-modes/mode/perl";
import { lua } from "@codemirror/legacy-modes/mode/lua";
import { swift } from "@codemirror/legacy-modes/mode/swift";
import { csharp, kotlin, scala, dart } from "@codemirror/legacy-modes/mode/clike";
import { haskell } from "@codemirror/legacy-modes/mode/haskell";
import { r } from "@codemirror/legacy-modes/mode/r";
import { julia } from "@codemirror/legacy-modes/mode/julia";
import { crystal } from "@codemirror/legacy-modes/mode/crystal";
import { pascal } from "@codemirror/legacy-modes/mode/pascal";
import { clojure } from "@codemirror/legacy-modes/mode/clojure";
import { cobol } from "@codemirror/legacy-modes/mode/cobol";
import { d } from "@codemirror/legacy-modes/mode/d";
import { erlang } from "@codemirror/legacy-modes/mode/erlang";
import { fortran } from "@codemirror/legacy-modes/mode/fortran";
import { groovy } from "@codemirror/legacy-modes/mode/groovy";
import { oCaml } from "@codemirror/legacy-modes/mode/mllike";
import { powerShell } from "@codemirror/legacy-modes/mode/powershell";

export const PLAYGROUND_LANGUAGES: LanguageConfig[] = [
    {
        id: "javascript",
        label: "JavaScript",
        header: "",
        footer: "",
        initialBody: `console.log("Hello, World!");`,
        extension: async () => javascript(),
    },
    {
        id: "typescript",
        label: "TypeScript",
        header: "",
        footer: "",
        initialBody: `console.log("Hello, World!");`,
        extension: async () => javascript({ typescript: true }),
    },
    {
        id: "python",
        label: "Python",
        header: "",
        footer: "",
        initialBody: `print("Hello, World!")`,
        extension: async () => python(),
    },
    {
        id: "java",
        label: "Java",
        header: "",
        footer: "",
        initialBody: `public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`,
        extension: async () => java(),
    },
    {
        id: "c",
        label: "C",
        header: "",
        footer: "",
        initialBody: `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`,
        extension: async () => cpp(),
    },
    {
        id: "cpp",
        label: "C++",
        header: "",
        footer: "",
        initialBody: `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`,
        extension: async () => cpp(),
    },
    {
        id: "csharp",
        label: "C#",
        header: "",
        footer: "",
        initialBody: `using System;\n\npublic class Program {\n    public static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}`,
        extension: async () => StreamLanguage.define(csharp),
    },
    {
        id: "go",
        label: "Go",
        header: "",
        footer: "",
        initialBody: `package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}`,
        extension: async () => go(),
    },
    {
        id: "rust",
        label: "Rust",
        header: "",
        footer: "",
        initialBody: `fn main() {\n    println!("Hello, World!");\n}`,
        extension: async () => rust(),
    },
    {
        id: "php",
        label: "PHP",
        header: "",
        footer: "",
        initialBody: `<?php\necho "Hello, World!";\n`,
        extension: async () => php(),
    },
    {
        id: "ruby",
        label: "Ruby",
        header: "",
        footer: "",
        initialBody: `puts "Hello, World!"`,
        extension: async () => StreamLanguage.define(ruby),
    },
    {
        id: "perl",
        label: "Perl",
        header: "",
        footer: "",
        initialBody: `print "Hello, World!\\n";`,
        extension: async () => StreamLanguage.define(perl),
    },
    {
        id: "swift",
        label: "Swift",
        header: "",
        footer: "",
        initialBody: `print("Hello, World!")`,
        extension: async () => StreamLanguage.define(swift),
    },
    {
        id: "kotlin",
        label: "Kotlin",
        header: "",
        footer: "",
        initialBody: `fun main() {\n    println("Hello, World!")\n}`,
        extension: async () => StreamLanguage.define(kotlin),
    },
    {
        id: "scala",
        label: "Scala",
        header: "",
        footer: "",
        initialBody: `object Main {\n    def main(args: Array[String]): Unit = {\n        println("Hello, World!")\n    }\n}`,
        extension: async () => StreamLanguage.define(scala),
    },
    {
        id: "dart",
        label: "Dart",
        header: "",
        footer: "",
        initialBody: `void main() {\n  print('Hello, World!');\n}`,
        extension: async () => StreamLanguage.define(dart),
    },
    {
        id: "bash",
        label: "Bash",
        header: "",
        footer: "",
        initialBody: `echo "Hello, World!"`,
        extension: async () => StreamLanguage.define(shell),
    },
    {
        id: "powershell",
        label: "PowerShell",
        header: "",
        footer: "",
        initialBody: `Write-Output "Hello, World!"`,
        extension: async () => StreamLanguage.define(powerShell),
    },
    {
        id: "r",
        label: "R",
        header: "",
        footer: "",
        initialBody: `print("Hello, World!")`,
        extension: async () => StreamLanguage.define(r),
    },
    {
        id: "lua",
        label: "Lua",
        header: "",
        footer: "",
        initialBody: `print("Hello, World!")`,
        extension: async () => StreamLanguage.define(lua),
    },
    {
        id: "haskell",
        label: "Haskell",
        header: "",
        footer: "",
        initialBody: `main = putStrLn "Hello, World!"`,
        extension: async () => StreamLanguage.define(haskell),
    },
    {
        id: "julia",
        label: "Julia",
        header: "",
        footer: "",
        initialBody: `println("Hello, World!")`,
        extension: async () => StreamLanguage.define(julia),
    },
    {
        id: "crystal",
        label: "Crystal",
        header: "",
        footer: "",
        initialBody: `puts "Hello, World!"`,
        extension: async () => StreamLanguage.define(crystal),
    },
    {
        id: "nim",
        label: "Nim",
        header: "",
        footer: "",
        initialBody: `echo "Hello, World!"`,
        extension: async () => python(), // Nim syntax is similar to Python, using python mode as fallback/closest
    },
    {
        id: "pascal",
        label: "Pascal",
        header: "",
        footer: "",
        initialBody: `program Hello;\nbegin\n  writeln('Hello, World!');\nend.`,
        extension: async () => StreamLanguage.define(pascal),
    },
    {
        id: "clojure",
        label: "Clojure",
        header: "",
        footer: "",
        initialBody: `(println "Hello, World!")`,
        extension: async () => StreamLanguage.define(clojure),
    },
    {
        id: "cobol",
        label: "COBOL",
        header: "",
        footer: "",
        initialBody: `       IDENTIFICATION DIVISION.\n       PROGRAM-ID. HELLO-WORLD.\n       PROCEDURE DIVISION.\n           DISPLAY 'Hello, World!'.\n           STOP RUN.`,
        extension: async () => StreamLanguage.define(cobol),
    },
    {
        id: "d",
        label: "D",
        header: "",
        footer: "",
        initialBody: `import std.stdio;\n\nvoid main() {\n    writeln("Hello, World!");\n}`,
        extension: async () => StreamLanguage.define(d),
    },
    {
        id: "erlang",
        label: "Erlang",
        header: "",
        footer: "",
        initialBody: `-module(main).\n-export([main/0]).\n\nmain() ->\n    io:format("Hello, World!~n").`,
        extension: async () => StreamLanguage.define(erlang),
    },
    {
        id: "fortran",
        label: "Fortran",
        header: "",
        footer: "",
        initialBody: `program hello\n  print *, "Hello, World!"\nend program hello`,
        extension: async () => StreamLanguage.define(fortran),
    },
    {
        id: "groovy",
        label: "Groovy",
        header: "",
        footer: "",
        initialBody: `println "Hello, World!"`,
        extension: async () => StreamLanguage.define(groovy),
    },
    {
        id: "ocaml",
        label: "OCaml",
        header: "",
        footer: "",
        initialBody: `print_endline "Hello, World!";;`,
        extension: async () => StreamLanguage.define(oCaml),
    },
    {
        id: "sqlite3",
        label: "SQLite3",
        header: "",
        footer: "",
        initialBody: `SELECT 'Hello, World!';`,
        extension: async () => sql(),
    }
];
