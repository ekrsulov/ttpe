import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const testResultsDir = path.join(__dirname, 'doc', 'docs', 'test-evidences');

const files = fs.readdirSync(testResultsDir).filter(file => file.endsWith('.md'));

for (const file of files) {
    const folderName = file.replace('.md', '');
    const filePath = path.join(testResultsDir, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    const videoPath = `/test-evidences/${folderName}/video.webm`;
    const linkPattern = new RegExp(`\\[View test video\\]\\(${videoPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\)`, 'g');
    const oldEmbedPattern = new RegExp(`<video controls>\\s*<source src="${videoPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" type="video/webm">\\s*Your browser does not support the video tag.\\s*</video>`, 'g');
    const videoEmbed = `<video controls>
<source src="${videoPath}" type="video/webm" />
Your browser does not support the video tag.
</video>`;
    content = content.replace(linkPattern, videoEmbed);
    content = content.replace(oldEmbedPattern, videoEmbed);
    fs.writeFileSync(filePath, content);
}