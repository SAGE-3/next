/**
 * Copyright (c) SAGE3 Development Team 2022. All Rights Reserved
 * University of Hawaii, University of Illinois Chicago, Virginia Tech
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 */

import { Tree, formatFiles, installPackagesTask } from '@nrwl/devkit';
// import { libraryGenerator } from '@nx/workspace/generators';
// import { getProjectConfig } from '@nx/workspace';
import { join } from 'path';
import { promises as fs } from 'fs';

// Arguments to the build
interface Schema {
  // Name of the application
  name: string;
  // Main developer
  username: string;
  // primary type handled by the app
  statetype: string;
  statename: string;
  val: string;
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
async function sortApplication(root: string) {
  const filePath = join(root, 'libs', 'applications', 'src', 'lib', 'apps.json');
  const filedata = await fs.readFile(filePath);
  // Parse the xisting json file
  const apps = JSON.parse(filedata.toString());
  // Create a set from it (to get unique app names)
  const appSet = new Set(apps);
  // Save the updated array
  const output = JSON.stringify(Array.from(appSet).sort(), null, 4);
  await fs.writeFile(filePath, output);
}

/**
 * Update the imports in libs/applications/src/index.ts
 *
 * @param {string} root
 */
async function updateApps(root: string) {
  console.log('App> updating index file');
  const filePath = join(root, 'libs', 'applications', 'src', 'lib', 'apps.json');
  const indexPath = join(root, 'libs', 'applications', 'src', 'lib', 'apps.ts');
  // Read apps.json file
  const filedata = await fs.readFile(filePath);
  // Parse it as an array
  const apps = Array.from(JSON.parse(filedata.toString())) as string[];
  let output = '// SAGE3 Generated from apps.json file\n\n';
  for (let i in apps) {
    const it = apps[i];
    output += `import { name as ${it}Name } from './apps/${it}';\n`;
  }

  output += `\n`;
  output += `\n`;
  for (let i in apps) {
    const it = apps[i];
    output += `import ${it} from './apps/${it}/${it}';\n`;
  }
  output += `import React from 'react';\n`;

  output += `\n`;
  output += `\n`;
  output += `export const Applications = {\n`;
  for (let i in apps) {
    const it = apps[i];
    output += `  [${it}Name]: { AppComponent: React.memo(${it}.AppComponent), ToolbarComponent: ${it}.ToolbarComponent },\n`;
  }
  output += `} as unknown as Record<string, { AppComponent: () => JSX.Element, ToolbarComponent: () => JSX.Element }>;\n`;

  output += `\n`;
  output += `export * from './components';\n`;

  // Export all the applications and save
  await fs.writeFile(indexPath, output);
  console.log('App> ', indexPath, 'updated');
}

/**
 * Update the imports in libs/applications/src/initialValues.ts
 *
 * @param {string} root
 */
async function updateInit(root: string) {
  console.log('App> updating index file');
  const filePath = join(root, 'libs', 'applications', 'src', 'lib', 'apps.json');
  const indexPath = join(root, 'libs', 'applications', 'src', 'lib', 'initialValues.ts');
  // Read apps.json file
  const filedata = await fs.readFile(filePath);
  // Parse it as an array
  const apps = Array.from(JSON.parse(filedata.toString())) as string[];
  let output = '// SAGE3 Generated from apps.json file\n\n';
  for (let i in apps) {
    const it = apps[i];
    output += `import { name as ${it}Name, init as default${it} } from './apps/${it}';\n`;
  }

  output += `\n`;
  output += `export const initialValues = {\n`;
  for (let i in apps) {
    const it = apps[i];
    output += `  [${it}Name]: default${it},\n`;
  }
  output += `};\n\n`;

  // Export all the applications and save
  await fs.writeFile(indexPath, output);
  console.log('App> ', indexPath, 'updated');
}

/**
 * Update the metadata imports in libs/applications/src/metadata.ts
 *
 * @param {string} root
 */
async function updateTypes(root: string) {
  console.log('App> updating types file');
  const filePath = join(root, 'libs', 'applications', 'src', 'lib', 'apps.json');
  const indexPath = join(root, 'libs', 'applications', 'src', 'lib', 'types.ts');
  // Read apps.json file
  const filedata = await fs.readFile(filePath);

  // Parse it as an array
  const apps = Array.from(JSON.parse(filedata.toString())) as string[];
  let output = '// SAGE3 Generated from apps.json file\n\n';
  for (let i in apps) {
    const it = apps[i];
    output += `import { state as ${it}State, name as ${it}Name } from './apps/${it}';\n`;
  }
  output += `\n`;
  output += `\n`;
  output += `export type AppState =\n`;
  output += `  | {}\n`;
  for (let i in apps) {
    const it = apps[i];
    const idx = Number(i);
    if (idx == apps.length - 1) {
      output += `  | ${it}State;\n`;
    } else {
      output += `  | ${it}State\n`;
    }
  }

  output += `\n`;
  output += `\n`;
  output += `export type AppName = `;
  for (let i in apps) {
    const it = apps[i];
    const idx = Number(i);
    if (idx == apps.length - 1) {
      output += `typeof ${it}Name;`;
    } else {
      output += `typeof ${it}Name | `;
    }
  }

  // Export all the applications and save
  await fs.writeFile(indexPath, output);
  console.log('App> ', indexPath, 'updated');
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

  try {
    // update apps.json
    await sortApplication(host.root);
    // update index.ts
    await updateApps(host.root);
    // update metadata.ts
    await updateTypes(host.root);
    // update intialValues.ts
    await updateInit(host.root);
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
