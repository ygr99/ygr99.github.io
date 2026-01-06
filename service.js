const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// 解析日期
function parseDateFromTitle(title) {
  const regex = /📆\s*(\d{4}年\d{2}月\d{2}日)/;
  const match = title.match(regex);
  if (match) {
    return match[1].replace(/年|月/g, "-").replace("日", "");
  }
  return null;
}

// 解析文件内容
function parseFileContent(content) {
  const lines = content.split("\n");
  const result = [];
  let currentBlock = null;
  let lastDate = null;
  const sentences = [];

  lines.forEach((line) => {
    if (line.startsWith("∞∞∞markdown")) {
      if (currentBlock && currentBlock.title) {
        result.push(currentBlock);
      }
      currentBlock = {
        id: null, // 初始化 id 为 null
        title: "",
        date: null,
        section: "",
        word_count: 0,
        content: "",
        href: "", // 添加 href 字段
      };
    } else if (line.startsWith("∞∞∞")) {
      // 遇到其他类型的块（如 ∞∞∞css），结束当前的 markdown 块
      if (currentBlock && currentBlock.title) {
        result.push(currentBlock);
      }
      currentBlock = null; // 设置为 null，后续内容不会被添加到 markdown 块中
    } else if (currentBlock) {
      if (line.startsWith("# 📆") || line.startsWith("# 📘")) {
        if (currentBlock.title) {
          result.push(currentBlock);
          currentBlock = {
            id: null, // 初始化 id 为 null
            title: "",
            date: null,
            section: "",
            word_count: 0,
            content: "",
            href: "", // 添加 href 字段
          };
        }

        currentBlock.title = line;
        currentBlock.date = parseDateFromTitle(line);
        currentBlock.section = line.includes("📆") ? "📆" : "📘";

        // 如果是 # 📆 标题，更新 lastDate
        if (currentBlock.section === "📆" && currentBlock.date) {
          lastDate = currentBlock.date;
        }

        // 如果是 # 📘 标题，并且没有日期，使用 lastDate
        if (currentBlock.section === "📘" && !currentBlock.date) {
          currentBlock.date = lastDate;
        }
      } else if (currentBlock.title) {
        currentBlock.content += line + "\n";
      }
    }

    // 提取包含 #句子 的行
    if (line.includes("#句子")) {
      sentences.push(line.replace("#句子", "").trim());
    }
  });

  if (currentBlock && currentBlock.title) {
    result.push(currentBlock);
  }

  // 过滤掉没有标题的块
  const filteredResult = result.filter((item) => item.title);

    // 计算字数（使用精确的字数统计函数）
  filteredResult.forEach((item) => {
    // 调用字数统计函数获取详细统计结果
    const wordStats = countWords(item.content);
    // 将统计结果赋值给item，可根据需要保留total或全部详细数据
    item.word_count = wordStats.total; // 保留总字数
    // 如需保留各类型详细统计，可添加以下代码
    // item.word_stats = wordStats;
  });

  // 精确的字数统计函数
  function countWords(content) {
    // 去除多余的空格和换行符
    const trimmedContent = content.replace(/\s+/g, " ").trim();

    // 统计中文字符（包括中文标点）
    const chineseChars = (
      trimmedContent.match(
        /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65]/g
      ) || []
    ).length;

    // 统计数字
    const numbers = (trimmedContent.match(/\d+/g) || []).length;

    // 统计英文单词（去除标点符号和数字）
    const englishWords = trimmedContent
      .replace(/[^\w\s]/g, "") // 去除标点符号
      .replace(/\d+/g, " ") // 将数字替换为空格
      .split(/\s+/) // 按空格分割
      .filter((word) => word.length > 0 && /^[a-zA-Z]+$/.test(word)).length; // 只保留纯英文单词

    return {
      chinese: chineseChars,
      english: englishWords,
      numbers: numbers,
      total: chineseChars + englishWords + numbers,
    };
  }

  // 生成唯一ID：使用日期+标题的哈希值
  // 这样即使删除文章，其他文章的ID也不会改变
  function generateUniqueId(date, title) {
    const hash = crypto
      .createHash("md5")
      .update(`${date || ""}${title || ""}`)
      .digest("hex");
    // 取前12位作为ID，既保证唯一性又不会太长
    return hash.substring(0, 12);
  }

  // 为每篇文章生成唯一ID
  filteredResult.forEach((item) => {
    item.id = generateUniqueId(item.date, item.title);
    item.href = `article.html?id=${item.id}`; // 生成 href 字段
  });

  return { parsedData: filteredResult, sentences };
}

// 读取文件并解析
function readAndParseFile(filePath) {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        reject(err);
      } else {
        const parsedData = parseFileContent(data);
        resolve(parsedData);
      }
    });
  });
}

// 覆盖 data.json 文件
function writeDataToJsonFile(data, filePath) {
  const jsonData = JSON.stringify(data, null, 2);
  fs.writeFile(filePath, jsonData, "utf8", (err) => {
    if (err) {
      console.error("Error writing to data.json:", err);
    } else {
      console.log("Data successfully written to data.json");
    }
  });
}

// 覆盖 sentence.json 文件
function writeSentencesToJsonFile(sentences, filePath) {
  const jsonData = JSON.stringify({ sentences }, null, 2);
  fs.writeFile(filePath, jsonData, "utf8", (err) => {
    if (err) {
      console.error("Error writing to sentence.json:", err);
    } else {
      console.log("Data successfully written to sentence.json");
    }
  });
}

// 主函数
async function main() {
  const bufferFilePath = path.join(
    "C:",
    "99",
    "document",
    "heynote",
    "buffer.txt"
  );
  const dataFilePath = path.join(__dirname, "data.json");
  const sentenceFilePath = path.join(__dirname, "sentence.json");

  try {
    const { parsedData, sentences } = await readAndParseFile(bufferFilePath);
    writeDataToJsonFile(parsedData, dataFilePath);
    writeSentencesToJsonFile(sentences, sentenceFilePath);
  } catch (err) {
    console.error("Error processing file:", err);
  }
}

main();
