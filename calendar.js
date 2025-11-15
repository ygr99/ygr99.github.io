document.addEventListener("DOMContentLoaded", function () {
  const loadingSpinner = document.getElementById("loading-spinner");
  loadingSpinner.style.display = "flex";

  fetch("data.json")
    .then((response) => response.json())
    .then((data) => {
      const calendarEl = document.getElementById("calendar");
      const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "zh-cn", // 设置为中文
        firstDay: 1, // 设置每周以星期一为开始
        events: data.map((item) => ({
          title: item.title.replace(/^#\s*/, ""), // 去掉标题开头的 # 符号
          start: item.date,
          url: item.href,
          backgroundColor: item.section === "📆" ? "#30a5ff" : "#ffb347",
          borderColor: item.section === "📆" ? "#30a5ff" : "#ffb347",
          textColor: "#ffffff",
        })),
        eventClick: function (info) {
          info.jsEvent.preventDefault();
          window.open(info.event.url, "_blank");
        },
        eventContent: function (arg) {
          return {
            html: `<div class="fc-event-title">${arg.event.title}</div>`,
          };
        },
        // 自定义表头内容
        dayHeaderContent: function (arg) {
          // 只显示星期，不显示周数
          return { html: `<div>${arg.text}</div>` };
        },
        // 自定义单元格内容
        dayCellContent: function (arg) {
          if (arg.date.getDay() === 1) {
            // 如果是周一，显示 ISO 周数
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

// 获取 ISO 周数的函数
function getISOWeek(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7; // 将周日调整为 6，周一到周六为 0-5
  target.setDate(target.getDate() - dayNr + 3); // 设置到本周的周四
  const firstThursday = target.valueOf();
  target.setMonth(0, 1); // 设置到当年的 1 月 1 日
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7)); // 调整到第一个周四
  }
  return 1 + Math.ceil((firstThursday - target) / 604800000); // 计算周数
}
