// archive.js
const fs = require('fs');
const path = require('path');

const prdPath = path.join(__dirname, 'prd.json');
const prdArchivePath = path.join(__dirname, 'prd_archive.json');
const progressPath = path.join(__dirname, 'progress.txt');
const progressArchivePath = path.join(__dirname, 'progress_archive.txt');

console.log('🧹 正在执行 Ralph 自动瘦身归档...');

// ==========================================
// 1. 处理 prd.json (提取 passes: true)
// ==========================================
if (fs.existsSync(prdPath)) {
    try {
        const prd = JSON.parse(fs.readFileSync(prdPath, 'utf8'));
        const completed = prd.stories.filter(s => s.passes === true);
        const pending = prd.stories.filter(s => s.passes === false);

        if (completed.length > 0) {
            let archive = { branchName: prd.branchName, stories: [] };
            if (fs.existsSync(prdArchivePath)) {
                archive = JSON.parse(fs.readFileSync(prdArchivePath, 'utf8'));
            }
            
            archive.stories.push(...completed);
            fs.writeFileSync(prdArchivePath, JSON.stringify(archive, null, 2));

            prd.stories = pending;
            fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2));
            console.log(`✅ 已将 ${completed.length} 个完成的任务归档到 prd_archive.json`);
        }
    } catch (e) {
        console.error('❌ 解析 prd.json 失败，跳过 PRD 归档', e.message);
    }
}

// ==========================================
// 2. 处理 progress.txt (按行智能归档)
// ==========================================
if (fs.existsSync(progressPath)) {
    const progressContent = fs.readFileSync(progressPath, 'utf8');
    // 按换行符分割文件内容
    const lines = progressContent.split(/\r?\n/);
    
    let headerEndIndex = 0;
    // 动态寻找头部信息结束的位置（通常在 "Started:" 之后的一个空行）
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('Started:')) {
            headerEndIndex = i + 1;
            // 跳过紧接着的空行
            while(headerEndIndex < lines.length && lines[headerEndIndex].trim() === '') {
                headerEndIndex++;
            }
            break;
        }
    }

    // 提取头部 (包含规范和Started) 和 日志主体 (过滤掉纯空行)
    const header = lines.slice(0, headerEndIndex).join('\n');
    const logLines = lines.slice(headerEndIndex).filter(line => line.trim() !== '');

    // 只要真实日志行数超过 3 行，就触发归档
    if (logLines.length > 3) {
        const oldLogs = logLines.slice(0, logLines.length - 2).join('\n') + '\n';
        const recentLogs = logLines.slice(logLines.length - 2).join('\n') + '\n';

        // 追加旧日志到归档文件
        fs.appendFileSync(progressArchivePath, oldLogs);

        // 重写 progress.txt，保留头部和最近的 2 条记录
        fs.writeFileSync(progressPath, header + '\n\n' + recentLogs);
        console.log(`✅ 已归档 ${logLines.length - 2} 条旧日志到 progress_archive.txt`);
    } else {
        console.log(`ℹ️ progress.txt 只有 ${logLines.length} 条记录，无需归档 (设定的阈值为 > 3)`);
    }
}