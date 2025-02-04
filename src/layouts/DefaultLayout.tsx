import React, { memo, useEffect, useRef, useState } from 'react';
import classnames from 'classnames';
import { useDispatch, useSelector } from 'react-redux';
import GlobalFilter from '../components/GlobalFilter/GlobalFilter';
import { useScalprum } from '@scalprum/react-core';
import { Masthead, MastheadToggle, Page, PageSidebar, PageToggleButton } from '@patternfly/react-core';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/Header/Header';
import Cookie from 'js-cookie';
import isEqual from 'lodash/isEqual';
import { onToggle } from '../redux/actions';
import Routes from '../components/Routes/Routes';
import useOuiaTags from '../utils/useOuiaTags';
import RedirectBanner from '../components/Stratosphere/RedirectBanner';
import BarsIcon from '@patternfly/react-icons/dist/js/icons/bars-icon';
import { useIntl } from 'react-intl';
import messages from '../locales/Messages';
import { CROSS_ACCESS_ACCOUNT_NUMBER } from '../utils/consts';
import { getUrl } from '../utils/common';

import '../components/Navigation/Navigation.scss';
import './DefaultLayout.scss';
import { ReduxState } from '../redux/store';

type ShieldedRootProps = {
  hideNav?: boolean;
  isGlobalFilterEnabled?: boolean;
  initialized?: boolean;
  Sidebar?: React.ReactNode;
};

const ShieldedRoot = memo(
  ({ hideNav = false, isGlobalFilterEnabled = false, initialized = false, Sidebar }: ShieldedRootProps) => {
    const dispatch = useDispatch();
    const [isMobileView, setIsMobileView] = useState(window.document.body.clientWidth < 1200);
    const [isNavOpen, setIsNavOpen] = useState(!isMobileView);
    /**
     * Required for event listener to access the variables
     */
    const mutableStateRef = useRef({
      isMobileView,
    });
    function navReziseListener() {
      const internalMobile = window.document.body.clientWidth < 1200;
      const { isMobileView } = mutableStateRef.current;
      if (!isMobileView && internalMobile) {
        setIsMobileView(true);
        setIsNavOpen(false);
        mutableStateRef.current = {
          isMobileView: true,
        };
      } else if (isMobileView && !internalMobile) {
        setIsMobileView(false);
        setIsNavOpen(true);
        mutableStateRef.current = {
          isMobileView: false,
        };
      }
    }

    const intl = useIntl();

    useEffect(() => {
      window.addEventListener('resize', navReziseListener);
      return () => {
        window.removeEventListener('resize', navReziseListener);
      };
    }, []);

    if (!initialized) {
      return null;
    }

    const selectedAccountNumber = Cookie.get(CROSS_ACCESS_ACCOUNT_NUMBER);
    const hasBanner = false; // Update this later when we use feature flags

    return (
      <Page
        className={classnames({ 'chr-c-page__hasBanner': hasBanner, 'chr-c-page__account-banner': selectedAccountNumber })}
        onPageResize={null} // required to disable PF resize observer that causes re-rendring issue
        header={
          <Masthead className="chr-c-masthead">
            {!hideNav && (
              <MastheadToggle>
                <PageToggleButton
                  variant="plain"
                  aria-label="Global navigation"
                  isNavOpen={isNavOpen}
                  onNavToggle={() => {
                    setIsNavOpen((prev) => !prev);
                    dispatch(onToggle());
                  }}
                >
                  <BarsIcon />
                </PageToggleButton>
              </MastheadToggle>
            )}
            <Header />
          </Masthead>
        }
        sidebar={hideNav ? undefined : <PageSidebar isNavOpen={isNavOpen} id="chr-c-sidebar" nav={Sidebar} />}
      >
        <div className={classnames('chr-render')}>
          {isGlobalFilterEnabled && <GlobalFilter key={getUrl('bundle')} />}
          {selectedAccountNumber && <div className="chr-viewing-as">{intl.formatMessage(messages.viewingAsAccount, { selectedAccountNumber })}</div>}
          <RedirectBanner />
          <Routes routesProps={{ scopeClass: 'chr-scope__default-layout' }} />
        </div>
      </Page>
    );
  },
  (prevProps, nextProps) => isEqual(prevProps, nextProps)
);

ShieldedRoot.displayName = 'ShieldedRoot';

const isGlobalFilterAllowed = () => {
  if (getUrl('bundle') === 'insights') {
    return true;
  }

  return getUrl('bundle') === 'ansible' && ['inventory', 'drift', 'advisor'].includes(getUrl('app'));
};

export type RootAppProps = {
  globalFilterHidden?: boolean;
  Sidebar?: React.ReactNode;
  globalFilterRemoved?: boolean;
};

const RootApp = ({ globalFilterHidden, Sidebar, globalFilterRemoved }: RootAppProps) => {
  const ouiaTags = useOuiaTags();
  const initialized = useScalprum(({ initialized }) => initialized);
  const { pathname } = useLocation();
  const hideNav = useSelector(({ chrome: { user } }: ReduxState) => !user || !Sidebar);

  /**
   * Using the chrome landing flag is not going to work because the appId is initialized inside the app.
   * We need the information before anything is rendered to determine if we use root module or render landing page.
   * This will be replaced once we can use react router for all pages. Landing page will have its own route.
   */
  const isLanding = pathname === '/';

  const globalFilterAllowed = (!globalFilterHidden && isGlobalFilterAllowed()) || globalFilterRemoved;

  const isGlobalFilterEnabled = !isLanding && (globalFilterAllowed || Boolean(localStorage.getItem('chrome:experimental:global-filter')));

  return (
    <div id="chrome-app-render-root" {...ouiaTags}>
      <ShieldedRoot isGlobalFilterEnabled={isGlobalFilterEnabled} hideNav={hideNav} initialized={initialized} Sidebar={Sidebar} />
    </div>
  );
};

export default RootApp;
