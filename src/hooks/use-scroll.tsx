
'use client';
import React from 'react';

export function useScroll(threshold: number) {
	const [scrolled, setScrolled] = React.useState(false);

	const onScroll = React.useCallback(() => {
		setScrolled(window.scrollY > threshold);
	}, [threshold]);

	React.useEffect(() => {
		window.addEventListener('scroll', onScroll);
		// Call onScroll on mount to set the initial state correctly on the client.
		onScroll(); 
		return () => window.removeEventListener('scroll', onScroll);
	}, [onScroll]);


	return scrolled;
}
