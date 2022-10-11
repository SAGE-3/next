// Components
import { useEffect, useState } from 'react';
import { Box, Text, Stack } from '@chakra-ui/react';
import { GetConfiguration } from '@sage3/frontend';
import { KernelSpecs } from '..';
import { JSONOutput } from '../../SageCell/components/json';

const SpecTab = () => {
  
  // store the kernels as a state
  const [kernelSpecs, setKernelSpecs] = useState<KernelSpecs[]>([]); // KernelProps[];

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
  const getSpecs = () => {
    const url = `${!prod ? `http://${window.location.hostname}` : `http://${window.location.hostname}:4443`}/api/kernelspecs`;
    fetch(url, {
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })
      .then((res) => res.json())
      .then((data) => {
        // console.log(JSON.stringify(data));
        setKernelSpecs(data);
      });
  };

  return (
    <Box p={4} onClick={getSpecs}>
      <Stack spacing={2}>
        {JSONOutput(JSON.stringify(kernelSpecs))}
      </Stack>
    </Box>
  );
};

export default SpecTab;