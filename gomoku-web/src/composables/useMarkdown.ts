import { ref, computed } from 'vue';
import MarkdownIt from 'markdown-it';

/**
 * Markdown渲染钩子
 * 提供markdown文本解析和渲染功能
 */
export function useMarkdown() {
  // 创建markdown-it实例，启用常用插件
  const md = new MarkdownIt({
    html: false, // 禁止HTML标签，防止XSS攻击
    linkify: true, // 自动转换URL为链接
    typographer: true, // 启用排版优化（引号、省略号等）
    breaks: true, // 将换行符转换为<br>
  });

  /**
   * 将markdown文本转换为HTML
   */
  const renderMarkdown = (text: string): string => {
    if (!text) return '';
    return md.render(text);
  };

  /**
   * 创建响应式的markdown渲染函数
   */
  const useRenderedMarkdown = (text: string) => {
    const rendered = computed(() => renderMarkdown(text));
    return rendered;
  };

  return {
    renderMarkdown,
    useRenderedMarkdown,
  };
}