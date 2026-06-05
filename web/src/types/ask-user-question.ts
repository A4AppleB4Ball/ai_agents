/**
 * AskUserQuestion tool type definitions
 *
 * [INPUT]: No external dependencies
 * [OUTPUT]: Exposes AskUserQuestionInput, UserQuestion, QuestionOption, and UserQuestionAnswer
 * [POS]: Tool-specific types for the types module, consumed by ask-user-question-block.tsx
 * [PROTOCOL]: Update this header when making changes, then check CLAUDE.md
 */

// ==================== AskUserQuestion tool input ====================

/** Question option */
export interface QuestionOption {
    /** Option label (unique identifier) */
    label: string;
    /** Option description */
    description?: string;
}

/** Single question */
export interface UserQuestion {
    /** Question text */
    question: string;
    /** Question title/category */
    header?: string;
    /** Whether multiple selections are allowed, defaults to false */
    multiSelect?: boolean;
    /** List of options */
    options: QuestionOption[];
}

/** AskUserQuestion tool input structure */
export interface AskUserQuestionInput {
    questions: UserQuestion[];
}

// ==================== User answers ====================

/** Answer to a single question */
export interface UserQuestionAnswer {
    /** Question index */
    questionIndex: number;
    /** List of selected option labels */
    selectedOptions: string[];
}

/** Complete response */
export interface UserQuestionResponse {
    /** tool_use id */
    toolUseId: string;
    /** Answers to all questions */
    answers: UserQuestionAnswer[];
}
