/**
 * AskUserQuestion Block Component - User Q&A interaction component
 *
 * Renders Claude's questions, supports single/multiple choice, returns user answers to Agent
 *
 * [INPUT]: Depends on @/types/ask-user-question, @/types/message, @/lib/utils
 * [OUTPUT]: Provides AskUserQuestionBlock component
 * [POS]: Specialized tool component in block module, consumed by content-renderer.tsx
 * [PROTOCOL]: Update this header when changed, then check CLAUDE.md
 */

"use client";

import { useState, useCallback, useMemo } from 'react';
import { Check, CheckCircle, ChevronDown, ChevronRight, Circle, MessageSquare, Send, Square, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ToolUseContent } from '@/types/message';
import { AskUserQuestionInput, UserQuestion, UserQuestionAnswer } from '@/types/ask-user-question';

// ==================== Type definitions ====================

interface AskUserQuestionBlockProps {
    /** tool_use block */
    toolUse: ToolUseContent;
    /** Submit answer callback */
    onSubmit?: (toolUseId: string, answers: UserQuestionAnswer[]) => void;
    /** Whether submitted */
    isSubmitted?: boolean;
}

// ==================== Sub-components ====================

/** Single question card (supports independent collapse) */
function QuestionCard({
    question,
    questionIndex,
    selectedOptions,
    onToggleOption,
    isSubmitted,
    defaultExpanded = false,
}: {
    question: UserQuestion;
    questionIndex: number;
    selectedOptions: Set<string>;
    onToggleOption: (questionIndex: number, optionLabel: string, multiSelect: boolean) => void;
    isSubmitted: boolean;
    defaultExpanded?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const isMultiSelect = question.multiSelect ?? false;
    const hasSelection = selectedOptions.size > 0;

    // Selection summary (shown when collapsed)
    const selectionSummary = Array.from(selectedOptions).slice(0, 2).join(', ') +
        (selectedOptions.size > 2 ? '...' : '');

    return (
        <div className={cn(
            "border rounded-lg overflow-hidden transition-all duration-200",
            hasSelection ? "border-primary/40 bg-primary/5" : "border-border/30 bg-card/30"
        )}>
            {/* Question header (clickable to collapse) */}
            <div
                className={cn(
                    "px-3 py-2 flex items-center gap-2 cursor-pointer select-none",
                    "hover:bg-primary/5 transition-colors",
                    isExpanded && "border-b border-border/20"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {/* Serial number */}
                <span className={cn(
                    "w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold",
                    hasSelection ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                    {questionIndex + 1}
                </span>

                {/* Header label */}
                {question.header && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                        {question.header}
                    </span>
                )}

                {/* Question text */}
                <span className="text-sm font-medium text-foreground truncate flex-1">
                    {question.question}
                </span>

                {isMultiSelect && (
                    <span className="text-[10px] text-muted-foreground">(Multi-select)</span>
                )}

                {/* Show selection summary when collapsed */}
                {!isExpanded && hasSelection && (
                    <span className="text-xs text-primary/70 truncate max-w-[120px]">
                        {selectionSummary}
                    </span>
                )}

                {/* Selection count */}
                {hasSelection && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-medium">
                        {selectedOptions.size}
                    </span>
                )}

                {/* Expand/collapse indicator */}
                <div className="text-muted-foreground/40">
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                </div>
            </div>

            {/* Options list (collapsible) */}
            {isExpanded && (
                <div className="p-3 space-y-2">
                    {question.options.map((option, optIndex) => {
                        const isSelected = selectedOptions.has(option.label);
                        const Icon = isMultiSelect
                            ? (isSelected ? CheckSquare : Square)
                            : (isSelected ? CheckCircle : Circle);

                        return (
                            <button
                                key={optIndex}
                                disabled={isSubmitted}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleOption(questionIndex, option.label, isMultiSelect);
                                }}
                                className={cn(
                                    "w-full text-left p-3 border rounded-lg transition-all duration-200",
                                    "hover:border-primary/50 hover:bg-primary/5",
                                    isSelected
                                        ? "border-primary/60 bg-primary/10 shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                                        : "border-border/40 bg-card/50",
                                    isSubmitted && "opacity-60 cursor-not-allowed"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <Icon className={cn(
                                        "w-4 h-4 mt-0.5 flex-shrink-0 transition-colors",
                                        isSelected ? "text-primary" : "text-muted-foreground/50"
                                    )} />
                                    <div className="flex-1 min-w-0">
                                        <div className={cn(
                                            "text-sm font-medium",
                                            isSelected ? "text-primary" : "text-foreground"
                                        )}>
                                            {option.label}
                                        </div>
                                        {option.description && (
                                            <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                                                {option.description}
                                            </div>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-medium">
                                            Selected
                                        </span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ==================== Main component ====================

export function AskUserQuestionBlock({
    toolUse,
    onSubmit,
    isSubmitted: initialSubmitted = false,
}: AskUserQuestionBlockProps) {
    // Parse input
    const input = toolUse.input as AskUserQuestionInput;
    const questions = input?.questions || [];

    // State: selected options for each question
    const [selections, setSelections] = useState<Map<number, Set<string>>>(() => {
        const map = new Map();
        questions.forEach((_, index) => map.set(index, new Set()));
        return map;
    });
    const [isSubmitted, setIsSubmitted] = useState(initialSubmitted);
    // Expand/collapse state: collapsed by default when submitted
    const [isExpanded, setIsExpanded] = useState(!initialSubmitted);

    // Toggle option
    const handleToggleOption = useCallback((questionIndex: number, optionLabel: string, multiSelect: boolean) => {
        if (isSubmitted) return;

        setSelections(prev => {
            const newMap = new Map(prev);
            const currentSet = new Set(prev.get(questionIndex) || []);

            if (multiSelect) {
                // Multi-select: toggle selection state
                if (currentSet.has(optionLabel)) {
                    currentSet.delete(optionLabel);
                } else {
                    currentSet.add(optionLabel);
                }
            } else {
                // Single select: clear then select
                currentSet.clear();
                currentSet.add(optionLabel);
            }

            newMap.set(questionIndex, currentSet);
            return newMap;
        });
    }, [isSubmitted]);

    // Check if can submit (at least one option selected for each question)
    const canSubmit = useMemo(() => {
        return questions.every((_, index) => {
            const selected = selections.get(index);
            return selected && selected.size > 0;
        });
    }, [questions, selections]);

    // Submit answer
    const handleSubmit = useCallback(() => {
        if (!canSubmit || isSubmitted) return;

        const answers: UserQuestionAnswer[] = questions.map((_, index) => ({
            questionIndex: index,
            selectedOptions: Array.from(selections.get(index) || []),
        }));

        setIsSubmitted(true);
        setIsExpanded(false); // Collapse after submit
        onSubmit?.(toolUse.id, answers);
    }, [canSubmit, isSubmitted, questions, selections, toolUse.id, onSubmit]);

    // Calculate total selected
    const totalSelected = useMemo(() => {
        let count = 0;
        selections.forEach(set => count += set.size);
        return count;
    }, [selections]);

    // Get answer summary (shown when collapsed)
    const answerSummary = useMemo(() => {
        if (!isSubmitted) return null;
        const allSelected: string[] = [];
        selections.forEach(set => {
            set.forEach(label => allSelected.push(label));
        });
        return allSelected.slice(0, 3).join(', ') + (allSelected.length > 3 ? '...' : '');
    }, [isSubmitted, selections]);

    if (questions.length === 0) {
        return null;
    }

    return (
        <div className={cn(
            "my-2 border rounded-lg overflow-hidden transition-all duration-300",
            isSubmitted
                ? "border-green-500/40 bg-green-500/5"
                : "border-primary/40 bg-primary/5 shadow-[0_0_15px_rgba(0,240,255,0.05)]"
        )}>
            {/* ═══════════ Header (clickable to expand/collapse) ═══════════ */}
            <div
                className={cn(
                    "h-9 px-3 flex items-center gap-2 font-mono text-xs cursor-pointer select-none",
                    "hover:bg-primary/5 transition-colors",
                    isSubmitted ? "border-green-500/20" : "border-primary/20",
                    isExpanded && "border-b"
                )}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className={cn(
                    "w-5 h-5 flex items-center justify-center rounded",
                    isSubmitted ? "text-green-500" : "text-primary"
                )}>
                    {isSubmitted ? (
                        <CheckCircle className="w-3.5 h-3.5" />
                    ) : (
                        <MessageSquare className="w-3.5 h-3.5" />
                    )}
                </div>

                <span className={cn(
                    "font-medium uppercase tracking-wider",
                    isSubmitted ? "text-green-500" : "text-primary"
                )}>
                    {isSubmitted ? 'ANSWERED' : 'WAITING FOR YOUR INPUT'}
                </span>

                <span className="text-muted-foreground/30">│</span>

                <span className="text-muted-foreground">
                    {questions.length} questions
                </span>

                {/* Show answer summary when collapsed */}
                {!isExpanded && answerSummary && (
                    <>
                        <span className="text-muted-foreground/30">│</span>
                        <span className="text-muted-foreground/60 truncate max-w-[200px]">
                            {answerSummary}
                        </span>
                    </>
                )}

                <div className="flex-1" />

                {!isSubmitted && totalSelected > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                        Selected {totalSelected} items
                    </span>
                )}

                {/* Expand/collapse indicator */}
                <div className="text-muted-foreground/40">
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                </div>
            </div>

            {/* ═══════════ Question list (collapsible) ═══════════ */}
            {isExpanded && (
                <div className="p-4 space-y-6">
                    {questions.map((question, index) => (
                        <QuestionCard
                            key={index}
                            question={question}
                            questionIndex={index}
                            selectedOptions={selections.get(index) || new Set()}
                            onToggleOption={handleToggleOption}
                            isSubmitted={isSubmitted}
                        />
                    ))}
                </div>
            )}

            {/* ═══════════ Bottom action bar ═══════════ */}
            {!isSubmitted && isExpanded && (
                <div className="h-12 px-4 flex items-center justify-between border-t border-primary/20 bg-primary/5">
                    <span className="text-xs text-muted-foreground">
                        {canSubmit ? '✓ All selections completed' : 'Please select at least one option for each question'}
                    </span>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleSubmit();
                        }}
                        disabled={!canSubmit}
                        className={cn(
                            "px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all duration-200",
                            canSubmit
                                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                                : "bg-muted text-muted-foreground cursor-not-allowed"
                        )}
                    >
                        <Send className="w-3 h-3" />
                        Submit answer
                    </button>
                </div>
            )}

            {/* ═══════════ Submitted state (show when expanded) ═══════════ */}
            {isSubmitted && isExpanded && (
                <div className="h-10 px-4 flex items-center gap-2 border-t border-green-500/20 bg-green-500/5">
                    <Check className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs text-green-600 font-medium">Answer submitted</span>
                </div>
            )}
        </div>
    );
}

