/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState } from 'react';

import { Heading, Box, Link, Tooltip, useToast, ListItem, UnorderedList } from '@chakra-ui/react';

import axios from 'axios';
import { linkColor } from '@sage3/frontend/ui';

export const Information: React.FC = () => {
  const [version, setVersion] = useState("");
  const electronRuntime = isElectron();
  const [electronVersion, setElectronVersion] = useState("browser");

  useEffect(() => {
    axios
      .get('/api/configuration')
      .then((res) => {
        const config = res.data;
        setVersion(config.version);
      })
      .catch((error) => {
        if (!error.response.data.authentication) document.location.href = '/';
      });

    if (electronRuntime) {
      const electron = window.require('electron');
      // send a message to the main process asking for the version
      electron.ipcRenderer.on('version', (event: any, arg: string) => {
        if (arg) {
          setElectronVersion(arg);
        } else {
          setElectronVersion("Electron " + process.versions.electron);
        }
      })
      electron.ipcRenderer.send('asynchronous-message', 'version');
    } else {
      // @ts-ignore
      const brands = navigator.userAgentData?.brands;
      if (brands) {
        const current = [...brands].pop();
        setElectronVersion((prev) => (prev + " (" + current.brand + " " + current.version + ")"));
      }
    }

  }, []);


  return (
    <Box p={2} textAlign="left">
      <Heading size='lg' as="h1">Version</Heading>
      <UnorderedList>
        <ListItem>Server version: {version}</ListItem>
        <ListItem>Client version: {electronVersion}</ListItem>
        <ListItem>Download the client for your platform: <CopyToClipboard text="SAGE3 clients" link="https://sage3.sagecommons.org/?page_id=358" />
        </ListItem>
      </UnorderedList> <br />

      <Heading size='lg' as="h1">SAGE3</Heading>
      <CopyToClipboard text="https://sage3.sagecommons.org" link="https://sage3.sagecommons.org" />
      <p>SAGE3 is being developed by the Laboratory for Advanced Visualization and Applications (LAVA)
        and the Hawaii Data Science Institute (HI-DSI) at University of Hawaiʻi at Mānoa (UHM),
        the Electronic Visualization Laboratory (EVL) at University of Illinois Chicago (UIC),
        and the InfoVis Lab at Virginia Tech (VT).</p>
      <br />

      <Heading size='lg' as="h1">Support </Heading>
      <p>Please join the SAGE community and  post any questions on the SAGE3 Slack workspace:
        <CopyToClipboard text=" SAGE3 Slack" link="https://tinyurl.com/sagecommunity" />
      </p>
      <br />

      <Heading size='lg' as="h1">Citations </Heading>
      <p>Cite this work:</p>
      <UnorderedList>
        <ListItem>SAGE3, T. (2021). SAGE3 - Collaborate Smarter (Version 1.0.0) [Computer software]. https://sage3.sagecommons.org
        </ListItem>
        <ListItem>Jason Leigh, Mahdi Belcaid, Dylan Kobayashi, Nurit Kirshenbaum, Troy Wooton, Alberto Gonzalez, Luc Renambot, Andrew Johnson, Maxine Brown, Andrew Burks, Krishna Bharadwaj, Arthur Nishimoto, Lance Long, Jason Haga, Roberto Pelayo, John Burns, Francis Cristobal, Jared McLean (2019).
          <em>Usage Patterns of Wideband Display Environments In e-Science Research, Development and Training</em>,
          eScience 2019, San Diego, California, USA, September 24-27, 2019
        </ListItem>
      </UnorderedList>
      <br />

      <Heading size='lg' as="h1">Awards</Heading>
      SAGE3 receives major funding from the U.S.National Science Foundation(NSF):
      <br />
      - <CopyToClipboard text="Award #2004014" link="nsf.gov/awardsearch/showAward?AWD_ID=2004014&HistoricalAwards=false" />
      <br />
      - <CopyToClipboard text="Award #2003800" link="nsf.gov/awardsearch/showAward?AWD_ID=2003800&HistoricalAwards=false" />
      <br />
      - <CopyToClipboard text="Award #2003387" link="nsf.gov/awardsearch/showAward?AWD_ID=2003387&HistoricalAwards=false" />
      <br />
      <br />

    </Box >
  );
};

interface linkStyleProps {
  text: string;
  link: string;
}

function CopyToClipboard(props: linkStyleProps): JSX.Element {
  const toast = useToast();

  const handleCopy = () => {
    // Copy text to clipboard
    navigator.clipboard.writeText(props.link);
    // Notification
    toast({
      title: `Link has been copied to your clipboard`,
      status: 'success',
      duration: 4000,
      isClosable: true,
    });
  };

  return (
    <Tooltip label={'Copy to Clipboard'}>
      <Link color={linkColor()} onClick={handleCopy}>
        {props.text}
      </Link>
    </Tooltip>
  );
}


/**
 * Check if browser is Electron based on the userAgent.
 * NOTE: this does a require check, UNLIKE web view app.
 *
 * @returns true or false.
 */
function isElectron() {
  const w = window as any; // eslint-disable-line
  return typeof navigator === 'object' && typeof navigator.userAgent === 'string' && navigator.userAgent.includes('Electron') && w.require;
}
