export const BROWSER_TOOLS = [
  { name: 'tabs_context_mcp' },
  { name: 'tabs_close_mcp' },
  { name: 'tabs_create_mcp' },
  { name: 'tabs_query_mcp' },
  { name: 'tabs_update_mcp' },
  { name: 'windows_create_mcp' },
  { name: 'windows_get_all_mcp' },
  { name: 'windows_update_mcp' },
  { name: 'page_capture_screenshot_mcp' },
  { name: 'page_click_element_mcp' },
  { name: 'page_fill_element_mcp' },
  { name: 'page_get_console_logs_mcp' },
  { name: 'page_get_content_mcp' },
  { name: 'page_navigate_mcp' },
  { name: 'page_press_key_mcp' },
  { name: 'page_reload_mcp' },
  { name: 'page_scroll_mcp' },
  { name: 'page_wait_for_selector_mcp' },
  { name: 'browser_task' }
];

export function createClaudeForChromeMcpServer(context: any) {
  return {
    connect: async (transport: any) => {
      console.log('[Mock] ClaudeForChromeMcpServer connected');
    },
    close: async () => {
      console.log('[Mock] ClaudeForChromeMcpServer closed');
    }
  };
}

export type ClaudeForChromeContext = any;
export type Logger = any;
export type PermissionMode = any;
