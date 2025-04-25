import { checkLinkValid } from '@sage3/applications/apps';
import { useHexColor, useLinkStore, useThrottleApps, useUIStore } from '@sage3/frontend';
import { useState } from 'react';

export function LinkerMode() {
  const apps = useThrottleApps(250);
  const links = useLinkStore((state) => state.links);
  const addLink = useLinkStore((state) => state.addLink);
  const boardWidth = useUIStore((state) => state.boardWidth);
  const boardHeight = useUIStore((state) => state.boardHeight);

  const scale = useUIStore((state) => state.scale);

  const [candidateApps, setCandidateApps] = useState<string[]>([]);

  const appBoxes = apps.map((app) => ({
    id: app._id,
    position: app.data.position,
    size: app.data.size,
    type: app.data.type,
  }));

  const green = useHexColor('green');
  const red = useHexColor('red');

  // Linker Store
  const linkedAppId = useLinkStore((state) => state.linkedAppId);
  const setLinkedAppId = useLinkStore((state) => state.cacheLinkedAppId);

  function handleOnClick(e: React.MouseEvent<SVGRectElement>, targetId: string) {
    e.stopPropagation();
    if (linkedAppId) {
      if (linkedAppId === targetId) {
        setLinkedAppId('');
        return;
      } else {
        const sourceApp = apps.find((a) => a._id === linkedAppId);
        const targetApp = apps.find((a) => a._id === targetId);
        if (sourceApp && targetApp) {
          const valid = checkLinkValid(sourceApp, targetApp, 'run_order', apps, links);
          if (valid) {
            setLinkedAppId('');
            addLink(linkedAppId, targetId, sourceApp.data.boardId, 'run_order');
            return;
          }
        }
      }
    }
    if (targetId) {
      const targetApp = apps.find((a) => a._id === targetId);
      if (targetApp) {
        setLinkedAppId(targetId);
        // Calculate the canidate apps
        const canidateApps = apps
          .map((a) => {
            const valid = checkLinkValid(targetApp, a, 'run_order', apps, links);
            if (valid) {
              return a._id;
            }
            return null;
          })
          .filter((a) => a !== null) as string[];
        setCandidateApps(canidateApps);
      }
    }
  }

  return (
    <svg
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        zIndex: 100000,
      }}
      width={boardWidth}
      height={boardHeight}
    >
      {appBoxes.map((appBox) => (
        <g key={appBox.id}>
          <rect
            x={appBox.position.x}
            y={appBox.position.y}
            width={appBox.size.width}
            height={appBox.size.height}
            stroke={linkedAppId === appBox.id || candidateApps.includes(appBox.id) ? green : red}
            strokeWidth={2 / scale}
            fill="transparent"
            style={{ pointerEvents: 'auto', touchAction: 'auto' }}
            onClick={(e) => handleOnClick(e, appBox.id)}
          />
        </g>
      ))}
    </svg>
  );
}
