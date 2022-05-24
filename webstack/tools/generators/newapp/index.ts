/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Tree, formatFiles, installPackagesTask, generateFiles } from '@nrwl/devkit';
import { libraryGenerator } from '@nrwl/workspace/generators';
import { getProjectConfig } from '@nrwl/workspace';
import { join } from 'path';
import { promises as fs } from 'fs';

// Arguments to the build
interface Schema {
  // Name of the application
  name: string;
  // Main developer
  username: string;
  // primary type handled by the app
  type: string;
}

/**
 * CamelCase a string
 * @param str
 */
var camalize = function camalize(str: string) {
  return str.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());
};

/**
 * Add application name in apps.json file (array)
 *
 * @param {string} root
 * @param {string} name
 */
async function addApplication(root: string, name: string) {
  console.log('App> adding app', name);
  const filePath = join(root, 'libs/applications/src/apps.json');
  const filedata = await fs.readFile(filePath);
  // Parse the existing json file
  const apps = JSON.parse(filedata.toString());
  // Create a set from it (to get unique app names)
  const appSet = new Set(apps);
  // Add the new applications
  appSet.add(name);
  // Save the updated array
  const output = JSON.stringify(Array.from(appSet), null, 4);
  await fs.writeFile(filePath, output);
}

/**
 * Update the imports in libs/applications/src/index.ts
 *
 * @param {string} root
 */
async function updateIndex(root: string) {
  console.log('App> updating index file');
  const filePath = join(root, 'libs/applications/src/apps.json');
  const indexPath = join(root, 'libs/applications/src/index.ts');
  // Read apps.json file
  const filedata = await fs.readFile(filePath);
  // Parse it as an array
  const apps = Array.from(JSON.parse(filedata.toString())) as string[];
  let output = '// Generated from apps.json file\n\n';
  let exporting = 'export { ';
  for (let i in apps) {
    const it = apps[i];
    let obj = camalize(it);
    // Import each application
    output += `import ${obj} from './${it}';\n`;
    const idx = Number(i);
    if (idx == apps.length - 1) {
      exporting += `${obj} }; `;
    } else {
      exporting += `${obj}, `;
    }
  }
  // Export all the applications and save
  await fs.writeFile(indexPath, output + '\n' + exporting);
  console.log('App> ', indexPath, 'updated');
}

/**
 * Update the metadata imports in libs/applications/src/metadata.ts
 *
 * @param {string} root
 */
async function updateMeta(root: string) {
  console.log('App> updating meta file');
  const filePath = join(root, 'libs/applications/src/apps.json');
  const metaPath = join(root, 'libs/applications/src/metadata.ts');
  // Read the apps.json file
  const filedata = await fs.readFile(filePath);
  // Build an array from it
  const apps = Array.from(JSON.parse(filedata.toString())) as string[];
  let output = '// Generated from apps.json file\n\n';
  let exporting = 'export { ';
  for (let i in apps) {
    const it = apps[i];
    let obj = camalize(it);
    // Import the metadata for each application
    output += `import { meta as ${obj} } from './${it}/metadata';\n`;
    const idx = Number(i);
    if (idx == apps.length - 1) {
      exporting += `${obj} }; `;
    } else {
      exporting += `${obj}, `;
    }
  }
  // Export all the applications and save
  await fs.writeFile(metaPath, output + '\n' + exporting);
  console.log('App> ', metaPath, 'updated');
}

/**
 * Main function of the generator
 *
 * @export
 * @param {Tree} host
 * @param {Schema} schema
 * @returns
 */
export default async function (host: Tree, schema: Schema) {
  console.log('Schema>', schema);
  console.log('Folder>', host.root);
  const camel = camalize(schema.name);
  try {
    // Copy the files
    await generateFiles(
      host,
      // source files (inside generator folder)
      join(__dirname, 'files'),
      // destination
      join('./libs/applications/src', schema.name),
      // substitution variables (filenames and content of files)
      { tmpl: '', name: camel, username: schema.username, type: schema.type }
    );
    // update apps.json
    await addApplication(host.root, schema.name);
    // update index.ts
    await updateIndex(host.root);
    // update metadata.ts
    await updateMeta(host.root);
  } catch (err) {
    console.log('generateFiles error', err);
  }

  // Pretty please
  await formatFiles(host);

  // All done
  return () => {
    installPackagesTask(host);
  };
}
