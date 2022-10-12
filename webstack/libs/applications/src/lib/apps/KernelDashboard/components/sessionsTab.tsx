import { useEffect, useState } from 'react';
import { Box, Text, Stack, useColorModeValue } from '@chakra-ui/react';
import { GetConfiguration } from '@sage3/frontend';
import SessionCard from './sessionCard';
import { Session } from '..';

const SessionsTab = () => {

    const [sessions, setSessions] = useState<Session[]>([]);

    // get token and state on mount
    const [prod, setProd] = useState<boolean>();
    const [token, setToken] = useState<string>();

    // get the token and production state when the component mounts
    useEffect(() => {
        GetConfiguration().then((conf) => {
        setToken(conf.token);
        setProd(conf.production);
        });
    }, []);

    // method to get the kernels
    const getSessions = () => {
        const url = `${!prod 
            ? `http://${window.location.hostname}` 
            : `http://${window.location.hostname}:4443`}/api/sessions`;
        fetch(url, {
        headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
        },
        })
        .then((res) => res.json())
        .then((data) => {
            setSessions(data);
            console.log(JSON.stringify(data));
        });
    };

    const getActiveSessionCount = (sessions: Session[]) => {
        let count = 0;
        sessions.forEach((session) => {
            if (session.kernel.execution_state === 'idle') {
                count += 1;
            }
        });
        return count;
    };

    return (
        <Box 
            p={4} onClick={getSessions} 
            bg={useColorModeValue('#E8E8E8', '#1A1A1A')}
            >
        <Text mb={4} fontSize="sm">
            Here are the running sessions
        </Text>
        <Stack spacing={2}>
            {sessions.map((session, idx) => {
            return (
                <Box key={idx}>
                    <SessionCard {...session} />
                </Box>
            );
            })}
        </Stack>
        </Box>
    );
};

export default SessionsTab;
