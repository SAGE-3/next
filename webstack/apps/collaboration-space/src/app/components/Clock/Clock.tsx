/**
 * Copyright (c) SAGE3 Development Team
 *
 * Distributed under the terms of the SAGE3 License.  The full license is in
 * the file LICENSE, distributed as part of this software.
 *
 */

import React, { useEffect, useState, useRef } from "react";
import { Text, TextProps } from "@chakra-ui/layout";

// Date and time library
import format from 'date-fns/format'

/**
 * Show a text clock
 *
 * @export
 * @param {TextProps} props
 * @returns {JSX.Element}
 */
export function Clock(props: TextProps): JSX.Element {
  const [time, setTime] = useState<string>('')
  const timeout = useRef<number>();

  useEffect(() => {
    function startTime() {
      const today = new Date();
      // format using the date-fns library
      const result = format(today, "HH:mm");
      // Update the state
      setTime(result);
      // Updating every 30sec.
      timeout.current = window.setTimeout(startTime, 30 * 1000);
    }
    // Start the loop
    startTime();

    // Clear the timeout when leaving the board
    return () => {
      if (timeout.current) {
        window.clearTimeout(timeout.current);
      }
    };
  }, [])


  return (
    <Text {...props} m={0}>
      {time}
    </Text>
  );
}