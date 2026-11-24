const {app,BrowserWindow,dialog,ipcMain}=require('electron');
const path=require('path'),fs=require('fs'),os=require('os'),{spawn}=require('child_process');
let win;
function create(){win=new BrowserWindow({width:1540,height:960,minWidth:1100,minHeight:720,backgroundColor:'#171719',title:'Premiere Studio 2026',webPreferences:{preload:path.join(__dirname,'preload.js'),contextIsolation:true,nodeIntegration:false}});win.loadFile('index.html');}
app.whenReady().then(()=>{create();app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)create();});});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
ipcMain.handle('pick-media',async()=>{const r=await dialog.showOpenDialog({properties:['openFile','multiSelections'],filters:[{name:'Медиа',extensions:['mp4','mov','mkv','webm','avi','m4v','mp3','wav','m4a','aac']} ]});return r.canceled?[]:r.filePaths;});
ipcMain.handle('save-project',async(_,data)=>{const r=await dialog.showSaveDialog({defaultPath:'Untitled.pstudio',filters:[{name:'Premiere Studio Project',extensions:['pstudio']}]});if(r.canceled)return false;fs.writeFileSync(r.filePath,JSON.stringify(data,null,2));return true;});
ipcMain.handle('open-project',async()=>{const r=await dialog.showOpenDialog({properties:['openFile'],filters:[{name:'Premiere Studio Project',extensions:['pstudio']}]});if(r.canceled)return null;return JSON.parse(fs.readFileSync(r.filePaths[0],'utf8'));});
ipcMain.handle('export-video',async(_,payload)=>{
 const {clips,quality='1080p'}=payload; if(!clips?.length) return {ok:false,error:'На таймлайне нет клипов'};
 const out=await dialog.showSaveDialog({defaultPath:'PremiereStudio_Export.mp4',filters:[{name:'MP4 Video',extensions:['mp4']}]});if(out.canceled)return {ok:false,canceled:true};
 let ffmpeg;try{ffmpeg=require('ffmpeg-static');}catch(e){return {ok:false,error:'FFmpeg не найден. Переустановите зависимости проекта (npm install).'};}
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'premiere-studio-')); const parts=[];
 try{
  for(let i=0;i<clips.length;i++){
   const c=clips[i]; if(!c.path||!fs.existsSync(c.path)) throw new Error('Не найден исходный файл: '+(c.name||''));
   const part=path.join(temp,`part${i}.mp4`);parts.push(part);
   const duration=Math.max(.05,Number(c.end)-Number(c.start));
   const size=quality==='720p'?'1280:720':quality==='4k'?'3840:2160':'1920:1080';
   const args=['-y','-ss',String(c.start),'-i',c.path,'-t',String(duration),'-vf',`scale=${size}:force_original_aspect_ratio=decrease,pad=${size}:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p`,'-an','-c:v','libx264','-preset','veryfast','-crf','20',part];
   await new Promise((resolve,reject)=>{const p=spawn(ffmpeg,args,{windowsHide:true});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(new Error(err.slice(-1200)||'Ошибка FFmpeg')));});
  }
  const list=path.join(temp,'list.txt');fs.writeFileSync(list,parts.map(p=>`file '${p.replace(/\\/g,'/').replace(/'/g,"'\\''")}'`).join('\n'));
  await new Promise((resolve,reject)=>{const p=spawn(ffmpeg,['-y','-f','concat','-safe','0','-i',list,'-c','copy',out.filePath],{windowsHide:true});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',code=>code===0?resolve():reject(new Error(err.slice(-1600)||'Ошибка сборки')));});
  return {ok:true,path:out.filePath};
 }catch(e){return {ok:false,error:e.message};}finally{fs.rmSync(temp,{recursive:true,force:true});}
});
