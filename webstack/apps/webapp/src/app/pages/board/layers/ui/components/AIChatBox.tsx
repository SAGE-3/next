import { Box, Input, FormControl, Button, useToast } from '@chakra-ui/react';
import { AppSchema } from '@sage3/applications/schema';
import { AiAPI, useAppStore } from '@sage3/frontend';
import { AiQueryRequest } from '@sage3/shared';
import { useEffect } from 'react';

type AIChatBoxType = {
  boardId: string;
};

function AIChatBox({ boardId }: AIChatBoxType) {
  const apps = useAppStore((state) => state.apps);
  // console.log(apps);
  const updateBatch = useAppStore((state) => state.updateBatch);
  const toast = useToast();

  const actions = {
    handleChat: (a: string) => {
      console.log('handleChat', a);
    },
    reorganize: {
      input: () => {
        if (apps.length > 0) {
          const listOfApps = apps.map((app) => {
            console.log('app', app);
            return {
              _id: app._id,
              position: {
                x: app.data.position.x,
                y: app.data.position.y,
                z: app.data.position.z,
              },
              size: {
                width: app.data.size.width,
                height: app.data.size.height,
                depth: app.data.size.depth,
              },
              text: app.data.state.text,
            };
          });

          console.log(listOfApps);
          return listOfApps;
        }
        return null;
      },
      output: (output: []) => {
        const ps: Array<{ id: string; updates: Partial<AppSchema> }> = [];
        console.log('output', output);
        output.forEach(
          (app: { _id: string; position: { x: number; y: number; z: number }; size: { width: number; height: number; depth: number } }) => {
            ps.push({
              id: app._id,
              updates: {
                position: {
                  x: app.position.x,
                  y: app.position.y,
                  z: app.position.z,
                },
                size: {
                  width: app.size.width,
                  height: app.size.height,
                  depth: app.size.depth,
                },
              },
            });
          }
        );
        // Update all the apps at once
        updateBatch(ps);
      },
    },
  };

  const organizePrompt = '';

  useEffect(() => {
    async function fetchStatus() {
      const res = await AiAPI.status();
      console.log(res.onlineModels);
    }
    fetchStatus();
  }, []);

  return (
    <Box display="flex">
      <form
        autoComplete="off"
        style={{ display: 'flex' }}
        onSubmit={async (e) => {
          try {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            // const prompt = formData.get('prompt');
            console.log('boardid', boardId);

            const prompt = `You are a function that returns JSON and only that. You have the following objects:\n${JSON.stringify(
              actions['reorganize']['input']()
            )}\nPlease reorganize the objects as follows: change the position (x, y, z) of the objects, taking into account their size, so that they are located next to each other, aligned in a horizontal line without overlapping. Your return statement should include an array of objects with their new positions and sizes. Do NOT add comments. An example format of the output is: [{...}, {...}, ...}]. Triple check the x, y, and z values.`;

            const query = {
              input: prompt,
              model: 'openai',
            } as AiQueryRequest;

            const res = await AiAPI.query(query);
            if (res.success) {
              console.log(JSON.parse(res.output as string));
              actions['reorganize']['output'](JSON.parse(res.output as string));
            }
            // actions["handleChat"]("hello");
          } catch (error) {
            console.log('error', error);
            // toast({
            //   title: 'Error',
            //   status: 'error',
            //   duration: 3000,
            //   isClosable: true,
            //   position: 'bottom',
            //   description: error.message,
            // });
          }
        }}
      >
        <Input name="prompt" placeholder="Enter text here" roundedRight="0" />
        <Button roundedLeft="0" type="submit">
          Send
        </Button>
      </form>
    </Box>
  );
}

export default AIChatBox;
