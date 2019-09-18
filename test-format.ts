/**
 * This file is just a sanity check to detect any abnormalities in the formatter.
 * It clones several brightscript projects from github, formats them all, and then exits.
 * It is then the responsibility of the person running this script to review the files and
 * see if anything strange has been changed during the format process.
 */
import { exec } from 'child-process-promise';
import * as fsExtra from 'fs-extra';
import * as glob from 'glob-promise';
import * as path from 'path';

import { Formatter } from './src/Formatter';

const repositoryUrls = [
    'https://github.com/georgejecook/rokuNavSpike',
    'https://github.com/indossi/roku_music_player',
    'https://github.com/lumpenprole/roku-PanelTest',
    'https://github.com/chtaylo2/Roku-GooglePhotos',
    'https://github.com/benjohnemmett/RokuGame2D',
    'https://github.com/exegersha/network-benchmark',
    'https://github.com/lvcabral/Prince-of-Persia-Roku',
    'https://github.com/lvcabral/Moon-Patrol-Roku',
    'https://github.com/zeronil/exploration',
    'https://github.com/IAmJoffa/EACarShow',
    'https://github.com/lvcabral/Lode-Runner-Roku',
    'https://github.com/scottrudy/roku-one-drive',
    'https://github.com/rokudev/unit-testing-framework',
    'https://github.com/NeilWong/UnitTestingFrameworkSample',
    'https://github.com/jsFrontPage/roku',
    'https://github.com/musajoemo/CatholicUndergroundRokuApp',
    'https://github.com/trystant/Roku',
    'https://github.com/glanza2311/rokuToyProject',
    'https://github.com/exegersha/2048',
    'https://github.com/paulcullin/roku-ci-test',
    'https://github.com/VerizonAdPlatforms/VerizonVideoPartnerSDK-Roku',
];

let tempPath = path.join(__dirname, '.temp');

//clean the working directory
console.log('Removing temp directory');
fsExtra.removeSync(tempPath);
console.log('Creating empty temp directory');
fsExtra.ensureDir(tempPath);

//create a vscode-workspace file so we can compare all of the contents at one time
let workspace = {
    folders: [] as any[]
};

(async function main() {
    await Promise.all(
        repositoryUrls.map(async (repositoryUrl) => {
            let parts = repositoryUrl.split('/');
            const folderName = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
            const projectFolderPath = path.join(tempPath, folderName);
            workspace.folders.push({ path: folderName });
            console.log(`Cloning ${repositoryUrl}`);
            //clone the repo
            await exec(`git clone ${repositoryUrl} "${projectFolderPath}"`);

            //find every brightscript file
            let files = await glob('**/*.brs', {
                cwd: projectFolderPath
            });

            await Promise.all(
                files.map(async (filePath) => {
                    const formatter = new Formatter();
                    let fullFilePath = path.join(projectFolderPath, filePath);
                    console.log(`Loading file contents for "${fullFilePath}"`);
                    const fileContents = await fsExtra.readFile(fullFilePath);

                    console.log(`Formatting "${fullFilePath}"`);
                    const formattedFileContents = formatter.format(fileContents.toString(), {
                        keywordCase: null
                    });

                    console.log(`Saving formatting changes for "${fullFilePath}"`);
                    fsExtra.writeFile(fullFilePath, formattedFileContents);
                })
            );
        })
    );

    await fsExtra.writeFile(path.join(tempPath, 'workspace.code-workspace'), JSON.stringify(workspace));
})();
