// Components
import { useEffect, useState } from 'react';
import { Box, Text, Stack, useColorModeValue } from '@chakra-ui/react';
import { GetConfiguration } from '@sage3/frontend';
import KernelCard from "./KernelCard";
import { Kernel } from '..';


const KernelsTab = () => {
  // store the kernels as a state
    const [kernels, setKernels] = useState<Kernel[]>([]); // KernelProps[];

    // get token and state on mount
    const [prod, setProd] = useState<boolean>(false);
    const [token, setToken] = useState<string>('');

    // get the token and production state when the component mounts
    useEffect(() => {
      GetConfiguration().then((conf) => {
        setToken(conf.token);
        setProd(conf.production);
      });
    }, []);

    // method to get the kernels
    // const getKernels = () => {
    //   const url = `${!prod ? `http://${window.location.hostname}` : `http://${window.location.hostname}:4443`}/api/kernels`;
    //   fetch(url, {
    //     headers: {
    //       Authorization: `Token ${token}`,
    //       'Content-Type': 'application/json',
    //     },
    //   })
    //     .then((res) => res.json())
    //     .then((data) => {
    //       console.log(JSON.stringify(data));
    //       setKernels(data);
    //     });
    // };

    const getKernels = () => {
      const url = `${!prod ? `http://${window.location.hostname}` : `http://${window.location.hostname}:4443`}/api/kernels`;
      fetch(url, {
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then((res) => res.json())
        .then((data) => {
          // console.log(JSON.stringify(data));
          setKernels(data);
        });
    }
    
    const getKernelCount = (kernels: Kernel[]) => {
        let count = 0;
        kernels.forEach((kernel) => {
            if (kernel.execution_state === 'idle') {
                count += 1;
            }
        });
        return count;
    };

    return (
        <Box 
              p={4} onClick={getKernels} 
              bg={useColorModeValue('#E8E8E8', '#1A1A1A')}
              >
              <Text mb={4} fontSize="sm">
                  Here are the running kernels
              </Text>
              <Stack spacing={2}>
                  {kernels.map((kernel, idx) => {
                  return (
                      <Box key={idx}>
                          <KernelCard {...kernel} />
                      </Box>
                  );
                  })}
              </Stack>
          </Box>
    );
};

export default KernelsTab;
