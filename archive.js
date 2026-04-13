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
            // 读取或初始化归档文件
            let archive = { branchName: prd.branchName, stories: [] };
            if (fs.existsSync(prdArchivePath)) {
                archive = JSON.parse(fs.readFileSync(prdArchivePath, 'utf8'));
            }
            
            // 将完成的任务追加到归档中
            archive.stories.push(...completed);
            fs.writeFileSync(prdArchivePath, JSON.stringify(archive, null, 2));

            // 更新原 prd.json，只保留未完成的任务
            prd.stories = pending;
            fs.writeFileSync(prdPath, JSON.stringify(prd, null, 2));
            console.log(`✅ 已将 ${completed.length} 个完成的任务归档到 prd_archive.json`);
        }
    } catch (e) {
        console.error('❌ 解析 prd.json 失败，跳过 PRD 归档', e.message);
    }
}

// ==========================================
// 2. 处理 progress.txt (保留头部规范，归档旧日志)
// ==========================================
if (fs.existsSync(progressPath)) {
    const progressContent = fs.readFileSync(progressPath, 'utf8');
    // 以 "## 202" (日期开头) 作为分割点
    const parts = progressContent.split(/(?=## \d{4}-\d{2}-\d{2})/); 
    
    // parts[0] 是头部信息 (包含 Codebase Patterns)
    // parts[1...n] 是具体的历史日志
    if (parts.length > 3) { // 只有当历史日志超过 2 条时才触发归档
        const header = parts[0];
        const oldLogs = parts.slice(1, parts.length - 2).join(''); // 归档较旧的
        const recentLogs = parts.slice(parts.length - 2).join(''); // 保留最近的2条

        // 追加到归档文件
        fs.appendFileSync(progressArchivePath, oldLogs);

        // 重写 progress.txt (只保留头部和最近2条记录)
        fs.writeFileSync(progressPath, header + recentLogs);
        console.log(`✅ 已归档 ${parts.length - 3} 条旧日志到 progress_archive.txt`);
    }
}