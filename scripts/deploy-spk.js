#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

const repoUrl = 'https://github.com/ttptspk/ttptspk.github.io'
const repoDirName = 'ttptspk.github.io'

const spkSource = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR9G9YUsNRklszGvCJZ1Ufnw1JfDStsABMYyNzcsaOE6PLQleXOtP6LP-AEBXEkr-XViDINMEi_Uex9/pub?output=xlsx'
const spkEdit = 'https://docs.google.com/spreadsheets/d/1EhVJtmp6X_LCDJe4qZ_4sqRUJ52anxvGJ939zhfr46o/edit?gid=0#gid=0'

const cwd = process.cwd()
const targetDir = path.join(cwd, repoDirName)
const storePath = path.join(cwd, 'src', 'stores', 'protocolStore.js')

function run(cmd, opts = {}) {
  console.log('>', cmd)
  return execSync(cmd, { stdio: 'inherit', ...opts })
}

if (!fs.existsSync(storePath)) {
  console.error('Cannot find', storePath)
  process.exit(1)
}

const original = fs.readFileSync(storePath, 'utf8')
let modified = original

try {
  // Replace DEFAULT_SOURCE_URL and DEFAULT_EDIT_URL values
  modified = modified.replace(/const\s+DEFAULT_SOURCE_URL\s*=\s*['"`][^'"`]*['"`]/, `const DEFAULT_SOURCE_URL = '${spkSource}'`)
  modified = modified.replace(/const\s+DEFAULT_EDIT_URL\s*=\s*['"`][^'"`]*['"`]/, `const DEFAULT_EDIT_URL = '${spkEdit}'`)

  if (modified === original) {
    console.warn('No replacements made in protocolStore.js; pattern may have changed.')
  } else {
    fs.writeFileSync(storePath, modified, 'utf8')
    console.log('Patched protocolStore.js for SPK source/edit URLs')
  }

  // Ensure target repo directory exists (clone if missing)
  if (!fs.existsSync(targetDir)) {
    console.log('Cloning target repo into', repoDirName)
    run(`git clone ${repoUrl} ${repoDirName}`)
  }

  // Build with Vite into the target directory
  console.log('Building project into', repoDirName)
  run(`npx vite build --outDir ${repoDirName}`)

  // Commit & push
  console.log('Deploying to remote')
  try {
    run(`cd ${repoDirName} && git add --all && git commit -m "Deploy: spk ${new Date().toISOString()}" || echo "No changes to commit"`)
    run(`cd ${repoDirName} && git push`)
  } catch (e) {
    console.warn('Git commit/push failed — ensure you have push access and credentials set up')
  }

  console.log('Build and deploy finished — restoring original source file')
} catch (err) {
  console.error('Error during deploy-spk:', err)
} finally {
  // Always restore original file
  try {
    fs.writeFileSync(storePath, original, 'utf8')
    console.log('protocolStore.js restored to original state')
  } catch (e) {
    console.error('Failed to restore protocolStore.js:', e)
  }
}

console.log('Done.')
