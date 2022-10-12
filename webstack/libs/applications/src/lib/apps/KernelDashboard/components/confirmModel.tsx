/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import { Button, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalOverlay } from '@chakra-ui/react';

type currentAction = 'Destroy' | 'Stop' | 'Pause' | 'Restart' | 'Delete' | string
type currentObject = 'Kernel' | 'Session' | string

type ConfirmProps = {
    action: currentAction;
    object: currentObject;
    onClick: () => void;
    onClose: () => void;
};

const ConfirmModel = (props: ConfirmProps) => {
    return (
        <>
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>Confirm {props.action} {props.object}</ModalHeader>
                <ModalBody>Are you sure you want to {props.action} this {props.object}?</ModalBody>
                <ModalFooter>
                    <Button colorScheme="green" size="sm" mr={3} onClick={props.onClose}>
                        Cancel
                    </Button>
                    <Button colorScheme="red" size="sm" onClick={props.onClick}>
                        Yes, {props.action} {props.object}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </>
    );
}

export default ConfirmModel;