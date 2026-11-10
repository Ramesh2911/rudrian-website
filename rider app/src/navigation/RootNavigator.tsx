import React, { useEffect } from 'react';

import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { Loader } from '../components/Loader';
import { useOnline } from '../net/useOnline';
import { syncOutbox } from '../net/sync';
import { useAuth } from '../state/AuthContext';

function SyncBootstrapper(): null {
  const online = useOnline();
  const { status } = useAuth();
  const previous = React.useRef(online);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (online && !previous.current) {
      void syncOutbox();
    }
    previous.current = online;
  }, [online, status]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void syncOutbox();
  }, [status]);

  return null;
}

export function RootNavigator(): React.JSX.Element {
  const { status } = useAuth();

  if (status === 'loading') {
    return <Loader fullScreen label="Starting your shift..." />;
  }

  return (
    <>
      <SyncBootstrapper />
      {status === 'authenticated' ? <MainNavigator /> : <AuthNavigator />}
    </>
  );
}
