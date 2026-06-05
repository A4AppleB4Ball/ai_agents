export const initialOptions = {
  model: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'us.anthropic.claude-sonnet-4-6',
  permissionMode: 'default',
  includePartialMessages: true,
}
