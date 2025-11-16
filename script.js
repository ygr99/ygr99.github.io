// 定义全局变量 posts
let posts = [];

// 字符串转换为时间格式
function parseDate(str) {
  const date = new Date(str);
  // 将 UTC 时间转换为 CST 时间
  return new Date(date.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
}

// 获取本周的星期天作为开始时间
function getThisSunday(date) {
  const cstDate = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Shanghai" })
  );
  const dayOfWeek = cstDate.getDay();
  const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const thisSunday = new Date(cstDate);
  thisSunday.setDate(cstDate.getDate() + daysToSunday);
  return thisSunday;
}

// 获取当前年份
const currentYear = new Date().getFullYear();

// 获取年份选择框
const yearSelect = document.getElementById("year-select");

// 获取任意年份的第一周的起始日期
function getFirstWeekStartDate(selectedYear) {
  const firstDayOfYear = new Date(selectedYear, 0, 1); // 当年的1月1日
  const dayOfWeek = firstDayOfYear.getDay(); // 获取星期几（0=周日，1=周一，...，6=周六）

  // 如果1月1日不是周一，则第一周的起始日期是上一年的最后几天
  const firstWeekStartDate = new Date(firstDayOfYear);
  firstWeekStartDate.setDate(
    firstDayOfYear.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
  );

  return firstWeekStartDate;
}

// 获取任意年份的最后一周的结束日期
function getLastWeekEndDate(selectedYear) {
  const lastDayOfYear = new Date(selectedYear, 11, 31); // 当年的12月31日
  const dayOfWeek = lastDayOfYear.getDay(); // 获取星期几（0=周日，1=周一，...，6=周六）

  // 如果12月31日不是周日，则最后一周的结束日期是下一年的前几天
  const lastWeekEndDate = new Date(lastDayOfYear);
  lastWeekEndDate.setDate(
    lastDayOfYear.getDate() + (dayOfWeek === 0 ? 0 : 7 - dayOfWeek + 1)
  );

  return lastWeekEndDate;
}

// 根据选择的年份计算周数和日期范围
function getStartDate(selectedYear) {
  const today = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Shanghai" })
  );
  const startOfYear = new Date(
    new Date(selectedYear, 0, 1).toLocaleString("en-US", {
      timeZone: "Asia/Shanghai",
    })
  );
  const endOfYear = new Date(
    new Date(selectedYear, 11, 31).toLocaleString("en-US", {
      timeZone: "Asia/Shanghai",
    })
  );

  // 计算当前年份的总周数
  const dayOfYear = Math.ceil((today - startOfYear) / (1000 * 60 * 60 * 24));
  const weekNumber = Math.floor((dayOfYear - 1) / 7) + 1;

  let weeks, days;
  if (selectedYear === 2024) {
    weeks = weekNumber - 35 + 1; // 2024年从第35周开始
  } else if (selectedYear === 2025) {
    // 2025年的第一周从2024年12月30日开始
    const firstDayOf2025 = new Date(2025, 0, 1);
    const dayOfWeek = firstDayOf2025.getDay(); // 获取2025年1月1日是星期几
    const firstWeekStartDate = new Date(firstDayOf2025);
    firstWeekStartDate.setDate(
      firstDayOf2025.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)
    );
    weeks = weekNumber;
    days = weeks * 7 - 1;
    const startDate = new Date(firstWeekStartDate);
    return startDate;
  } else {
    weeks = weekNumber; // 其他年份从第1周开始
  }
  days = weeks * 7 - 1;

  const sunday = getThisSunday(today);
  const startDate = new Date(sunday);
  startDate.setDate(sunday.getDate() - days);

  return startDate;
}

// 构建基础数据 - 优化版本：使用 Map 索引，避免 O(n²) 复杂度
function dateBuild(data, startDate) {
  // 一次性建立日期索引，避免重复遍历
  const dateIndex = new Map(); // Map<dateStr, {items: [], wordcount: 0}>
  
  // 一次性遍历数据，建立索引
  data.forEach((item) => {
    const dateStr = parseDate(item.date).toISOString().split("T")[0];
    if (!dateIndex.has(dateStr)) {
      dateIndex.set(dateStr, { items: [], wordcount: 0 });
    }
    const entry = dateIndex.get(dateStr);
    entry.items.push(item);
    entry.wordcount += item.word_count || 0;
  });

  const result = [];
  const sunday = getThisSunday(new Date());
  const startDateCST = new Date(startDate.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const sundayCST = new Date(sunday.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));

  // 生成从 startDate 到 sunday 的数据数组
  for (let currentDate = new Date(sundayCST); currentDate >= startDateCST; currentDate.setDate(currentDate.getDate() - 1)) {
    const dateStr = currentDate.toISOString().split("T")[0];
    const entry = dateIndex.get(dateStr);
    
    if (entry) {
      result.push({
        date: dateStr,
        count: entry.items.length,
        data: entry.items,
        wordcount: entry.wordcount,
      });
    } else {
      result.push({
        date: dateStr,
        count: 0,
        data: [],
        wordcount: 0,
      });
    }
  }

  return result;
}

// 动态生成星期标签
function generateWeekLabels() {
  const weekLabels = ["一", "三", "五", "日"];
  const weekLabelsContainer = document.querySelector(".week-labels");
  weekLabelsContainer.innerHTML = ""; // 清空现有内容

  // 生成新的星期标签
  weekLabels.forEach((labelText) => {
    const label = document.createElement("div");
    label.className = "week-label";
    label.innerText = labelText;
    weekLabelsContainer.appendChild(label);
  });
}

// 转义 HTML 特殊字符
function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 填充热力图 - 优化版本：使用 DocumentFragment 批量创建 DOM
function fillHeatmap(data, startDate) {
  let articles = dateBuild(data, startDate);
  const gridContainer = document.getElementById("relitu-container");
  gridContainer.innerHTML = ""; // 清空现有内容

  // 获取选择的年份
  const selectedYear = parseInt(yearSelect.value);

  // 动态计算第一周的起始日期和最后一周的结束日期
  const firstWeekStartDate = getFirstWeekStartDate(selectedYear);
  const lastWeekEndDate = getLastWeekEndDate(selectedYear);

  let lastMonth = null; // 用于跟踪上一个月份
  let currentColumn = null; // 当前列
  let currentRowIndex = 0; // 当前列中的行索引（0-6）
  
  // 使用 DocumentFragment 批量创建 DOM
  const fragment = document.createDocumentFragment();
  const tippyElements = []; // 收集需要初始化 Tippy 的元素

  // 倒序遍历文章数据
  for (let i = articles.length - 1; i >= 0; i--) {
    const article = articles[i];
    // 获取当前格子的日期
    const currentDate = new Date(article.date);
    const currentMonth = currentDate.getMonth(); // 获取当前月份

    // 过滤数据：只显示在动态计算的日期范围内的数据
    if (currentDate < firstWeekStartDate || currentDate > lastWeekEndDate) {
      continue; // 跳过不在范围内的数据
    }

    // 检查是否是新的月份的开始
    if (lastMonth !== null && currentMonth !== lastMonth) {
      // 插入7个隐形格子
      for (let j = 0; j < 7; j++) {
        // 如果当前列已经满了（7个格子），则创建新列
        if (currentRowIndex >= 7) {
          if (currentColumn) {
            fragment.appendChild(currentColumn);
          }
          currentColumn = document.createElement("div");
          currentColumn.className = "grid-column";
          currentRowIndex = 0; // 重置行索引
        }

        // 创建隐形格子
        const gridItem = document.createElement("div");
        gridItem.className = "grid-item invisible";
        const itemInfo = document.createElement("div");
        itemInfo.className = "item-info";
        gridItem.appendChild(itemInfo);
        currentColumn.appendChild(gridItem);
        currentRowIndex++;
      }
    }

    lastMonth = currentMonth; // 更新上一个月份

    // 如果当前列已经满了（7个格子），则创建新列
    if (currentRowIndex >= 7) {
      if (currentColumn) {
        fragment.appendChild(currentColumn);
      }
      currentColumn = document.createElement("div");
      currentColumn.className = "grid-column";
      currentRowIndex = 0; // 重置行索引
    }

    // 创建格子
    const gridItem = document.createElement("div");
    gridItem.className = "grid-item";

    // 检查是否是当月的第一天
    const isFirstDayOfMonth = currentDate.getDate() === 1;
    const monthNumber = currentMonth + 1; // 月份从0开始，所以加1

    // 构建提示字符串 - 优化：使用数组 join 而不是多次字符串拼接
    const tooltipParts = [];
    for (let j = 0; j < article.data.length; j++) {
      const item = article.data[j];
      tooltipParts.push(`- <a href='${item.href}' target='_blank'>${escapeHtml(item.title)}</a></br>`);
    }
    const tooltipStr = tooltipParts.join(" ");

    // 构建格子内容
    const backgroundColor =
      article.wordcount != 0
        ? `rgba(30,129,248,${article.wordcount / 5000 + 0.2})`
        : "#E9ECEF";
    
    const itemInfo = document.createElement("div");
    itemInfo.className = "item-info item-tippy";
    itemInfo.setAttribute("data-date", article.date);
    itemInfo.setAttribute("data-tippy-content", `${article.date}，共 ${article.count} 篇，共 ${article.wordcount} 字<br />${tooltipStr}`);
    itemInfo.style.backgroundColor = backgroundColor;
    
    // 如果是月初，在格子内部显示月份标签
    if (isFirstDayOfMonth) {
      const monthLabel = document.createElement("span");
      monthLabel.className = "month-label";
      monthLabel.textContent = monthNumber;
      itemInfo.appendChild(monthLabel);
    }
    
    gridItem.appendChild(itemInfo);
    tippyElements.push(itemInfo); // 收集需要初始化 Tippy 的元素

    // 将格子添加到当前列中
    if (!currentColumn) {
      currentColumn = document.createElement("div");
      currentColumn.className = "grid-column";
    }
    currentColumn.appendChild(gridItem);
    currentRowIndex++;
  }
  
  // 添加最后一列
  if (currentColumn) {
    fragment.appendChild(currentColumn);
  }
  
  // 一次性添加到 DOM
  gridContainer.appendChild(fragment);

  // 生成星期标签
  generateWeekLabels();

  // 批量初始化 Tippy 提示 - 使用 requestIdleCallback 延迟初始化，避免阻塞渲染
  if (window.requestIdleCallback) {
    requestIdleCallback(() => {
      tippy(tippyElements, {
        allowHTML: true,
        interactive: true,
        maxWidth: "none",
        appendTo: () => document.body,
      });
    });
  } else {
    // 降级方案：使用 setTimeout
    setTimeout(() => {
      tippy(tippyElements, {
        allowHTML: true,
        interactive: true,
        maxWidth: "none",
        appendTo: () => document.body,
      });
    }, 0);
  }

  // 页面加载或重绘后，将热力图滚动到最右侧
  requestAnimationFrame(() => {
    gridContainer.scrollLeft = gridContainer.scrollWidth;
  });
}

// 生成笔记列表（展示所有年份的笔记）- 优化版本：使用 DocumentFragment
function generateNoteList(data) {
  const noteListContainer = document.getElementById("note-list");
  noteListContainer.innerHTML = ""; // 清空现有内容

  // 按年和月分组 - 优化：一次性遍历，避免多次 filter
  const groupedNotes = {};
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item.section !== "📘") continue; // 只处理笔记数据
    
    const date = new Date(item.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 月份从0开始，所以加1

    if (!groupedNotes[year]) {
      groupedNotes[year] = {};
    }
    if (!groupedNotes[year][month]) {
      groupedNotes[year][month] = [];
    }
    groupedNotes[year][month].push(item);
  }

  // 使用 DocumentFragment 批量创建 DOM
  const fragment = document.createDocumentFragment();
  
  // 按年和月排序并生成笔记列表
  const years = Object.keys(groupedNotes).sort((a, b) => b - a); // 按年降序
  
  for (let i = 0; i < years.length; i++) {
    const year = years[i];
    const yearData = groupedNotes[year];
    
    // 计算该年的笔记总数
    let yearNoteCount = 0;
    const months = Object.keys(yearData);
    for (let j = 0; j < months.length; j++) {
      yearNoteCount += yearData[months[j]].length;
    }

    const yearDiv = document.createElement("div");
    yearDiv.className = "note-year";
    yearDiv.textContent = year;
    const yearCountSpan = document.createElement("span");
    yearCountSpan.className = "note-year-count";
    yearCountSpan.textContent = yearNoteCount;
    yearDiv.appendChild(yearCountSpan);
    fragment.appendChild(yearDiv);

    // 按月降序排序 - 使用 slice 复制数组，避免修改原数组
    const sortedMonths = months.slice().sort((a, b) => b - a);
    
    for (let j = 0; j < sortedMonths.length; j++) {
      const month = sortedMonths[j];
      const monthNotes = yearData[month];
      const monthNoteCount = monthNotes.length;

      const monthDiv = document.createElement("div");
      monthDiv.className = "note-month";
      monthDiv.textContent = `${month}月 `;
      const monthCountSpan = document.createElement("span");
      monthCountSpan.className = "note-month-count";
      monthCountSpan.textContent = monthNoteCount;
      monthDiv.appendChild(monthCountSpan);
      fragment.appendChild(monthDiv);

      // 生成笔记项
      for (let k = 0; k < monthNotes.length; k++) {
        const note = monthNotes[k];
        const noteItem = document.createElement("div");
        noteItem.className = "note-item";
        
        const date = new Date(note.date);
        const monthStr = String(date.getMonth() + 1).padStart(2, "0");
        const dayStr = String(date.getDate()).padStart(2, "0");
        const dateStr = `${monthStr}-${dayStr}`;
        const title = note.title.replace(/^# 📘\s*/, ""); // 去掉标题中的 # 📘
        
        const link = document.createElement("a");
        link.href = note.href;
        link.target = "_blank";
        link.textContent = `${dateStr}     ${title}`;
        noteItem.appendChild(link);
        fragment.appendChild(noteItem);
      }
    }
  }
  
  // 一次性添加到 DOM
  noteListContainer.appendChild(fragment);
}

// 填充数据
function fillGrid(data, startDate) {
  // 填充热力图
  fillHeatmap(data, startDate);

  // 生成笔记列表（展示所有年份的笔记）
  generateNoteList(data);

  // 计算全部日记和笔记的数量 - 优化：一次遍历完成所有统计
  let diaryCount = 0;
  let noteCount = 0;
  let totalWordCount = 0;
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (item.section === "📆") {
      diaryCount++;
    } else if (item.section === "📘") {
      noteCount++;
    }
    totalWordCount += item.word_count || 0;
  }

  // 更新显示日记和笔记数量的元素
  const diaryCountElement = document.getElementById("diary-count");
  const noteCountElement = document.getElementById("note-count");
  const totalWordCountElement = document.getElementById("total-word-count");
  if (diaryCountElement && noteCountElement && totalWordCountElement) {
    diaryCountElement.innerText = diaryCount;
    noteCountElement.innerText = noteCount;
    totalWordCountElement.innerText = totalWordCount;
  }
}

// 重新填充数据
function refillGrid(data, selectedYear) {
  const loadingSpinner = document.getElementById("loading-spinner");
  loadingSpinner.style.display = "flex"; // 显示加载动画

  // 使用 requestAnimationFrame 确保在下一帧渲染，避免阻塞 UI
  requestAnimationFrame(() => {
    const startDate = getStartDate(selectedYear);
    fillGrid(data, startDate);
    // 使用 setTimeout 确保 DOM 更新完成后再隐藏加载动画
    setTimeout(() => {
      loadingSpinner.style.display = "none";
    }, 0);
  });
}

// 监听年份选择框的变化
yearSelect.addEventListener("change", function () {
  const selectedYear = parseInt(this.value);
  if (posts.length > 0) {
    refillGrid(posts, selectedYear);
  } else {
    // 如果 posts 未加载，重新获取数据
    fetch("data.json")
      .then((response) => response.json())
      .then((data) => {
        posts = data;
        refillGrid(posts, selectedYear);
      });
  }
});

// 在初始加载时，根据默认年份填充数据
document.addEventListener("DOMContentLoaded", function () {
  const loadingSpinner = document.getElementById("loading-spinner");
  loadingSpinner.style.display = "flex";

  // 设置默认年份为当前年份
  yearSelect.value = currentYear;

  fetch("data.json")
    .then((response) => response.json())
    .then((data) => {
      posts = data; // 将数据赋值给全局变量 posts
      const selectedYear = parseInt(yearSelect.value);
      const startDate = getStartDate(selectedYear);
      fillGrid(posts, startDate);

      // 预先过滤笔记和日记，避免每次点击都 filter
      const notes = [];
      const diaries = [];
      for (let i = 0; i < posts.length; i++) {
        const item = posts[i];
        if (item.section === "📘") {
          notes.push(item);
        } else if (item.section === "📆") {
          diaries.push(item);
        }
      }

      // 添加随机笔记跳转功能
      const randomNoteButton = document.getElementById("random-note");
      randomNoteButton.addEventListener("click", function (event) {
        event.preventDefault();
        if (notes.length > 0) {
          const randomIndex = Math.floor(Math.random() * notes.length);
          window.open(notes[randomIndex].href, "_blank");
        }
      });

      // 添加随机日记跳转功能
      const randomDiaryButton = document.getElementById("random-diary");
      randomDiaryButton.addEventListener("click", function (event) {
        event.preventDefault();
        if (diaries.length > 0) {
          const randomIndex = Math.floor(Math.random() * diaries.length);
          window.open(diaries[randomIndex].href, "_blank");
        }
      });

      // 获取随机句子
      fetch("sentence.json")
        .then((response) => response.json())
        .then((sentences) => {
          const randomIndex = Math.floor(
            Math.random() * sentences.sentences.length
          );
          const randomSentence = sentences.sentences[randomIndex];
          const randomSentenceDiv = document.getElementById("random-sentence");
          randomSentenceDiv.innerHTML = `<span>「 ${randomSentence} 」</span>`;
        });
    })
    .finally(() => {
      loadingSpinner.style.display = "none"; // 隐藏加载动画
    });
});
