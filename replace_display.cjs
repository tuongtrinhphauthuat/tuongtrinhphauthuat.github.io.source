const fs = require('fs');
const file = 'src/components/ProtocolDisplay.vue';
let content = fs.readFileSync(file, 'utf8');

const oldBottomBar = `<div id="display-bottom-bar" class="display__bottombar">
          <button id="display-btn-copy" class="icon-btn" @click="doCopy" :title="t('copy')">\{\{ t('copy') \}\}</button>
          <button id="display-btn-copy-source" class="icon-btn" @click="copySource" :title="t('copySource')">\{\{
            t('copySource') \}\}</button>

          <div style="margin-left:auto; display:flex; align-items:center; gap:16px">`;

const newBottomBar = `<div id="display-bottom-bar" class="display__bottombar">
          <div class="copy-dropdown">
            <button id="display-btn-copy" class="icon-btn" @click="doCopy" :title="t('copy')">\{\{ t('copy') \}\}</button>
            <div class="copy-dropdown-content">
              <button id="display-btn-copy-source" class="icon-btn" @click="copySource" :title="t('copySource')">\{\{ t('copySource') \}\}</button>
            </div>
          </div>
          <button id="display-btn-upload-image" class="icon-btn" @click="showUploadImageDialog = true" :title="t('menuEditUploadImage')">\{\{ t('menuEditUploadImage') \}\}</button>

          <div style="margin-left:auto; display:flex; align-items:center; gap:16px">`;

content = content.replace(oldBottomBar, newBottomBar);

const styleInsertPoint = `.icon-btn {
  background: #fff;
  border: 1px solid #e3e8ef;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer
}`;

const styleToAdd = `.icon-btn {
  background: #fff;
  border: 1px solid #e3e8ef;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  white-space: nowrap;
}

.copy-dropdown {
  position: relative;
  display: inline-block;
}

.copy-dropdown-content {
  display: none;
  position: absolute;
  bottom: 100%;
  left: 0;
  margin-bottom: 4px;
  background-color: #f9f9f9;
  min-width: 160px;
  box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.2);
  z-index: 100;
  border-radius: 8px;
}

.copy-dropdown-content .icon-btn {
  width: 100%;
  border: none;
  text-align: left;
  border-radius: 0;
  background: transparent;
}

.copy-dropdown-content .icon-btn:hover {
  background-color: #f1f1f1;
}

.copy-dropdown:hover .copy-dropdown-content {
  display: block;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e3e8ef;
}`;

content = content.replace(styleInsertPoint, styleToAdd);

fs.writeFileSync(file, content);
