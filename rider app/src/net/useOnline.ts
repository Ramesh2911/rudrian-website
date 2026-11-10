import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export async function isNetworkUp(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return !!state.isConnected && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let mounted = true;

    const apply = (state: { isConnected: boolean | null; isInternetReachable: boolean | null }): void => {
      if (!mounted) return;
      setOnline(!!state.isConnected && state.isInternetReachable !== false);
    };

    const unsubscribe = NetInfo.addEventListener((state) => {
      apply({ isConnected: state.isConnected, isInternetReachable: state.isInternetReachable });
    });

    void NetInfo.fetch().then((state) => {
      apply({ isConnected: state.isConnected, isInternetReachable: state.isInternetReachable });
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  return online;
}
