document.addEventListener("DOMContentLoaded", function () {
  const loadingSpinner = document.getElementById("loading-spinner");
  loadingSpinner.style.display = "flex";

  // 创建全局变量跟踪当前显示的预览面板信息
  window.currentPreviewInfo = {
    blockId: null,
    timer: null,
  };

  // 确保需要的库都已加载
  Promise.all([
    loadScriptIfNotExists("https://cdn.jsdelivr.net/npm/marked/marked.min.js"),
    loadScriptIfNotExists(
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"
    ),
    loadStyleIfNotExists(
      "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css"
    ),
    loadStyleIfNotExists(
      "https://cdn.jsdelivr.net/npm/github-markdown-css/github-markdown.min.css"
    ),
  ])
    .then(() => {
      console.log("所有预览所需库已加载");
    })
    .catch((error) => {
      console.error("加载预览所需库时出错:", error);
    });

  // 创建预览面板
  const previewPanel = document.createElement("div");
  previewPanel.className = "article-preview-panel";
  previewPanel.style.display = "none";
  document.body.appendChild(previewPanel);

  // 添加样式
  const style = document.createElement("style");
  style.textContent = `
    .article-preview-panel {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      overflow: auto;
      z-index: 1000;
      padding: 12px;
      cursor: pointer;
      transition: box-shadow 0.3s;
    }
    .article-preview-panel:hover {
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    .preview-header {
      margin-bottom: 10px;
      border-bottom: 1px solid #eee;
      padding-bottom: 8px;
    }
    .preview-title {
      font-weight: bold;
      font-size: 16px;
      color: #333;
    }
    .preview-date {
      font-size: 12px;
      color: #888;
      margin-top: 4px;
    }
    .preview-content {
      font-size: 14px;
      line-height: 1.5;
      max-height: 220px;
      overflow: auto;
      padding-right: 5px;
    }
    /* GitHub Markdown 样式调整 */
    .preview-content .markdown-body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
      font-size: 14px;
      padding: 0;
      color: #24292e;
    }
    .preview-content .markdown-body pre {
      margin-bottom: 16px;
    }
    .preview-content .markdown-body h1,
    .preview-content .markdown-body h2 {
      padding-bottom: 0.3em;
      border-bottom: 1px solid #eaecef;
    }
    .preview-content .markdown-body blockquote {
      padding: 0 1em;
      color: #6a737d;
      border-left: 0.25em solid #dfe2e5;
    }
    .preview-content .markdown-body table {
      border-spacing: 0;
      border-collapse: collapse;
    }
    .preview-content .markdown-body table th,
    .preview-content .markdown-body table td {
      padding: 6px 13px;
      border: 1px solid #dfe2e5;
    }
  `;
  document.head.appendChild(style);

  fetch("data.json")
    .then((response) => response.json())
    .then((data) => {
      // 处理数据，将 items 转换为日历事件
      const events = data.map((item) => {
        const firstLine = item.title;
        const isCalendarEntry = item.section === "📆";

        // 处理标题：移除 "# 📆" 或 "# 📘" 前缀
        let title = firstLine;
        if (isCalendarEntry) {
          title = title.replace(/^#\s*📆\s*/, "");
        } else {
          title = title.replace(/^#\s*📘\s*/, "");
        }

        return {
          title: title,
          start: item.date,
          url: item.href,
          backgroundColor: isCalendarEntry ? "#30a5ff" : "#ffb347",
          borderColor: isCalendarEntry ? "#30a5ff" : "#ffb347",
          textColor: "#ffffff",
          display: "block",
          classNames: isCalendarEntry ? ["calendar-entry"] : ["note-entry"],
          extendedProps: {
            blockId: item.id,
            blockContent: item.content,
          },
        };
      });

      const calendarEl = document.getElementById("calendar");
      const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "zh-cn",
        firstDay: 1,
        events: events,
        eventClick: function (info) {
          info.jsEvent.preventDefault();
          window.open(info.event.url, "_blank");
        },
        eventMouseEnter: function (mouseEnterInfo) {
          // 获取当前事件的ID
          const blockId = mouseEnterInfo.event.extendedProps.blockId;

          // 如果是不同的事件，或者没有显示预览面板，则显示新的预览面板
          if (blockId !== window.currentPreviewInfo.blockId) {
            // 显示预览面板前，先清除任何可能存在的隐藏定时器
            if (window.currentPreviewInfo.timer) {
              clearTimeout(window.currentPreviewInfo.timer);
              window.currentPreviewInfo.timer = null;
            }

            // 显示预览面板
            showPreviewPanel(mouseEnterInfo.el, blockId, data);
          }
        },
        eventMouseLeave: function () {
          // 延迟隐藏预览面板，给鼠标从事件移动到预览面板的时间
          hidePreviewPanel();
        },
        eventContent: function (arg) {
          return {
            html: `<div class="fc-event-title" style="padding-left: 4px !important;">${arg.event.title}</div>`,
          };
        },
        eventOrder: "classNames", // 使用类名排序，calendar-entry 会排在 note-entry 前面
        dayHeaderContent: function (arg) {
          return { html: `<div>${arg.text}</div>` };
        },
        dayCellContent: function (arg) {
          if (arg.date.getDay() === 1) {
            const isoWeek = getISOWeek(arg.date);
            return {
              html: `
                <div class="fc-daygrid-day-top">
                  <div class="fc-iso-week">第${isoWeek}周</div>
                  <div class="fc-daygrid-day-number">${arg.dayNumberText}</div>
                </div>
              `,
            };
          }
          return {
            html: `<div class="fc-daygrid-day-number">${arg.dayNumberText}</div>`,
          };
        },
      });

      calendar.render();
      loadingSpinner.style.display = "none";
    })
    .catch((error) => {
      console.error("Error loading data:", error);
      loadingSpinner.style.display = "none";
    });
});

// 显示预览面板
function showPreviewPanel(eventEl, blockId, blocks) {
  const article = blocks.find((item) => item.id == blockId);
  if (!article) return;

  // 更新当前预览的事件ID
  window.currentPreviewInfo.blockId = blockId;

  // 如果有隐藏计时器，取消它
  if (window.currentPreviewInfo.timer) {
    clearTimeout(window.currentPreviewInfo.timer);
    window.currentPreviewInfo.timer = null;
  }

  const previewPanel = document.querySelector(".article-preview-panel");
  const rect = eventEl.getBoundingClientRect();

  // 判断是否为日记（以 # 📆 开头）或笔记（以 # 📘 开头）
  const content = article.content;
  const isNote = article.section === "📘";
  const isDiary = article.section === "📆";

  // 获取标题
  let title = "";
  if (isNote) {
    title = article.title
      .replace(/^#\s*📘\s*/, "")
      .trim();
  } else if (isDiary) {
    title = article.title
      .replace(/^#\s*📆\s*/, "")
      .trim();
  } else {
    title = "未知类型";
  }

  // 获取内容（去掉第一行标题，如果内容以标题开头）
  let contentWithoutTitle = content;
  if (content.startsWith("# 📆") || content.startsWith("# 📘")) {
    contentWithoutTitle = content.split("\n").slice(1).join("\n");
  }

  // 使用 marked 解析 Markdown 内容（如果已加载）
  let htmlContent = contentWithoutTitle;
  if (window.marked) {
    try {
      // 使用与article.html相同的配置来解析markdown
      htmlContent = marked.parse(contentWithoutTitle, {
        breaks: true,
        highlight: function (code, lang) {
          if (window.hljs) {
            const language = window.hljs.getLanguage(lang) ? lang : "plaintext";
            return window.hljs.highlight(code, { language }).value;
          }
          return code;
        },
      });
    } catch (e) {
      console.error("Error parsing markdown:", e);
    }
  }

  // 设置预览面板内容
  previewPanel.innerHTML = `
    <div class="preview-header">
      <div class="preview-title">${
        isNote ? "📘" : isDiary ? "📆" : ""
      } ${title}</div>
      <div class="preview-date">${
        new Date(article.date).toISOString().split("T")[0]
      }</div>
    </div>
    <div class="preview-content">
      <div class="markdown-body">${htmlContent}</div>
    </div>
  `;

  // 如果highlight.js可用，初始化代码高亮
  if (window.hljs) {
    previewPanel.querySelectorAll("pre code").forEach((block) => {
      // 兼容新旧版本的 highlight.js
      if (window.hljs.highlightElement) {
        window.hljs.highlightElement(block);
      } else if (window.hljs.highlightBlock) {
        window.hljs.highlightBlock(block);
      }
    });
  }

  // 设置预览面板位置和样式
  previewPanel.style.display = "block";
  previewPanel.style.position = "absolute";

  // 计算位置，使面板显示在鼠标下方
  const panelHeight = 300; // 设置一个固定高度
  const panelWidth = 400; // 设置一个固定宽度

  // 计算面板应该放置的位置
  let top = rect.bottom + window.scrollY;
  let left = rect.left + window.scrollX;

  // 检查是否会超出屏幕底部
  if (top + panelHeight > window.innerHeight + window.scrollY) {
    top = rect.top + window.scrollY - panelHeight; // 将面板放在元素上方
  }

  // 检查是否会超出屏幕右侧
  if (left + panelWidth > window.innerWidth + window.scrollX) {
    left = window.innerWidth + window.scrollX - panelWidth - 10; // 留出10px的边距
  }

  previewPanel.style.top = `${top}px`;
  previewPanel.style.left = `${left}px`;
  previewPanel.style.width = `${panelWidth}px`;
  previewPanel.style.maxHeight = `${panelHeight}px`;

  // 为预览面板添加鼠标事件，防止鼠标移到面板上时面板消失
  previewPanel.onmouseenter = function () {
    // 鼠标进入预览面板时，清除任何可能存在的隐藏计时器
    if (window.currentPreviewInfo.timer) {
      clearTimeout(window.currentPreviewInfo.timer);
      window.currentPreviewInfo.timer = null;
    }
  };

  previewPanel.onmouseleave = function () {
    // 鼠标离开预览面板时，隐藏预览面板
    hidePreviewPanel();
  };

  // 添加点击事件
  previewPanel.onclick = function () {
    window.open(`article.html?id=${blockId}`, "_blank");
  };
}

// 隐藏预览面板
function hidePreviewPanel() {
  // 延迟隐藏，给鼠标从事件移动到预览面板的时间
  window.currentPreviewInfo.timer = setTimeout(() => {
    const previewPanel = document.querySelector(".article-preview-panel");
    previewPanel.style.display = "none";
    // 重置当前预览的事件ID
    window.currentPreviewInfo.blockId = null;
  }, 100);
}

// 获取 ISO 周数的函数
function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000);
}

// 如果脚本不存在则加载
function loadScriptIfNotExists(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// 如果样式不存在则加载
function loadStyleIfNotExists(href) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`link[href="${href}"]`)) {
      resolve();
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}
