"use client";
import React from 'react';
import { Plus, Trash2, GripVertical, Code, Type, Video, ArrowUp, ArrowDown } from 'lucide-react';
import { Question } from '../../types';
import RichTextEditor from '../../RichTextEditor';
import CodeMirrorEditor from '../../CodeMirrorEditor';

interface ReadingEditorProps {
    question: Question;
    onChange: (updates: Partial<Question>) => void;
}

export default function ReadingEditor({ question, onChange }: ReadingEditorProps) {
    const config = question.readingConfig || {
        contentBlocks: [
            { id: '1', type: 'text' as const, content: '<p>Write your reading material here...</p>' }
        ]
    };

    const updateConfig = (updates: Partial<typeof config>) => {
        onChange({ readingConfig: { ...config, ...updates } });
    };

    const addBlock = (type: 'text' | 'code-runner', index: number) => {
        const newBlock = {
            id: Date.now().toString(),
            type,
            content: type === 'text' ? '' : '',
            runnerConfig: type === 'code-runner' ? { language: 'javascript' as const, initialCode: '// Write starter code here' } : undefined
        };
        const newBlocks = [...config.contentBlocks];
        newBlocks.splice(index + 1, 0, newBlock);
        updateConfig({ contentBlocks: newBlocks });
    };

    const removeBlock = (index: number) => {
        if (config.contentBlocks.length <= 1) return; // Prevent deleting last block? Or allow empty state.
        updateConfig({ contentBlocks: config.contentBlocks.filter((_, i) => i !== index) });
    };

    const moveBlock = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === config.contentBlocks.length - 1) return;

        const newBlocks = [...config.contentBlocks];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        [newBlocks[index], newBlocks[swapIndex]] = [newBlocks[swapIndex], newBlocks[index]];
        updateConfig({ contentBlocks: newBlocks });
    };

    const updateBlock = (index: number, updates: any) => {
        updateConfig({
            contentBlocks: config.contentBlocks.map((b, i) => i === index ? { ...b, ...updates } : b)
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Reading Material Breakdown</h3>
                <div className="text-[10px] font-bold text-slate-300">
                    {config.contentBlocks.length} Blocks
                </div>
            </div>

            <div className="space-y-6">
                {config.contentBlocks.map((block, index) => (
                    <div key={block.id} className="relative group/block animate-fade-in-up">
                        {/* Add Button (Top, only for first item to allow prepending) */}
                        {index === 0 && (
                            <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity z-10 flex gap-2">
                                <AddButton onClick={() => addBlock('text', -1)} icon={<Type size={12} />} label="Add Text" />
                                <AddButton onClick={() => addBlock('code-runner', -1)} icon={<Code size={12} />} label="Add Code" />
                            </div>
                        )}

                        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all ring-1 ring-transparent hover:ring-[var(--brand)]/10">
                            {/* Block Header */}
                            <div className="h-10 px-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500">
                                        <GripVertical size={14} />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        {block.type === 'text' ? <Type size={14} className="text-[var(--brand)]" /> : <Code size={14} className="text-emerald-500" />}
                                        {block.type === 'text' ? 'Text Block' : 'Embedded Code Runner'}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover/block:opacity-100 transition-opacity">
                                    <button onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowUp size={14} /></button>
                                    <button onClick={() => moveBlock(index, 'down')} disabled={index === config.contentBlocks.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"><ArrowDown size={14} /></button>
                                    <div className="w-[1px] h-4 bg-slate-300 mx-1"></div>
                                    <button onClick={() => removeBlock(index)} className="p-1.5 text-slate-400 hover:text-rose-500"><Trash2 size={14} /></button>
                                </div>
                            </div>

                            {/* Block Content */}
                            <div className="p-0">
                                {block.type === 'text' ? (
                                    <div className="text-editor-wrapper">
                                        <RichTextEditor
                                            content={block.content}
                                            onChange={(val) => updateBlock(index, { content: val })}
                                            placeholder="Write content..."
                                        />
                                    </div>
                                ) : (
                                    <div className="p-6 bg-slate-900">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Language</label>
                                                <select
                                                    value={block.runnerConfig?.language}
                                                    onChange={(e) => updateBlock(index, { runnerConfig: { ...block.runnerConfig, language: e.target.value } })}
                                                    className="w-32 bg-slate-800 text-slate-200 text-xs font-bold rounded-lg px-2 py-1 outline-none border border-slate-700 focus:border-[var(--brand)]"
                                                >
                                                    <option value="javascript">JavaScript</option>
                                                    <option value="python">Python</option>
                                                    <option value="java">Java</option>
                                                    <option value="cpp">C++</option>
                                                </select>
                                            </div>
                                            <div className="flex flex-col gap-1 flex-1">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Description / Instructions</label>
                                                <input
                                                    type="text"
                                                    placeholder="e.g. Try modifying this code to calculate..."
                                                    className="w-full bg-slate-800 text-slate-300 text-xs px-3 py-1.5 rounded-lg border border-slate-700 focus:border-[var(--brand)] outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="rounded-xl overflow-hidden border border-slate-700">
                                            <CodeMirrorEditor
                                                value={block.runnerConfig?.initialCode || ''}
                                                onChange={(val) => updateBlock(index, { runnerConfig: { ...block.runnerConfig, initialCode: val } })}
                                                language={block.runnerConfig?.language as any}
                                                theme="dark"
                                                height="200px"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add Button (Center/Bottom) */}
                        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 opacity-0 group-hover/block:opacity-100 hover:opacity-100 transition-opacity z-10 flex gap-2">
                            <AddButton onClick={() => addBlock('text', index)} icon={<Type size={12} />} label="Add Text" />
                            <AddButton onClick={() => addBlock('code-runner', index)} icon={<Code size={12} />} label="Add Code" />
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .text-editor-wrapper :global(.prose) {
                    min-height: 150px;
                }
            `}</style>
        </div>
    );
}

function AddButton({ onClick, icon, label }: any) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--brand)] text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-[var(--brand)]/20 hover:scale-110 transition-transform"
        >
            <Plus size={12} strokeWidth={4} />
            {icon}
            {label}
        </button>
    )
}
