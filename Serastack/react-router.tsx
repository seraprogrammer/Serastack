import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  ReactNode,
  ReactElement,
  Suspense,
  ComponentType,
  FC,
  ErrorInfo,
} from "react";

// Type definitions
type LocationState = Record<string, any>;
type NavigateOptions = {
  replace?: boolean;
  state?: LocationState;
};

type RouterLocation = {
  pathname: string;
  search: string;
  hash: string;
  state?: LocationState;
};

type RouteParams = Record<string, string>;
type QueryParams = Record<string, string>;

type MatchResult = {
  params: RouteParams;
  isMatch: boolean;
} | null;

type RouterContextType = {
  location: RouterLocation;
  navigate: (to: string, options?: NavigateOptions) => void;
  queryParams: QueryParams;
  currentParams: RouteParams;
  setCurrentParams: (params: RouteParams) => void;
};

type RouteProps = {
  path?: string;
  element: ReactNode | ((params: RouteParams) => ReactNode);
  exact?: boolean;
  notFound?: boolean;
  guard?: (params: RouteParams) => boolean | Promise<boolean>;
  children?: ReactNode;
};

type RoutesProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type LinkProps = {
  to: string;
  children: ReactNode;
  replace?: boolean;
  state?: LocationState;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
  [key: string]: any;
};

type OutletProps = {
  context?: Record<string, any>;
};

type NavigateProps = {
  to: string;
  replace?: boolean;
  state?: LocationState;
};

type LazyRouteProps = {
  path?: string;
  component: () => Promise<{ default: ComponentType<any> }>;
  exact?: boolean;
  fallback?: ReactNode;
  guard?: (params: RouteParams) => boolean | Promise<boolean>;
};

type RouterErrorBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode | ((error: Error, reset: () => void) => ReactNode);
};

type RouterProviderProps = {
  children: ReactNode;
  errorFallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  basename?: string;
};

const RouterContext = createContext<RouterContextType | undefined>(undefined);
const RoutesContext = createContext<ReactElement<RouteProps>[]>([]);
const OutletContext = createContext<{
  children?: ReactNode;
  [key: string]: any;
}>({});
const BasenameContext = createContext<string>("");

/**
 * Parse URL parameters from path pattern and current URL
 */
const matchPath = (pattern: string, path: string): MatchResult => {
  const normalizedPattern =
    pattern.endsWith("/") && pattern !== "/" ? pattern.slice(0, -1) : pattern;
  const normalizedPath =
    path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;

  const paramNames: string[] = [];
  const regexPattern = normalizedPattern
    .replace(/:\w+/g, (match) => {
      paramNames.push(match.slice(1));
      return "([^/]+)";
    })
    .replace(/\*/g, "(.*)");

  const regex = new RegExp(`^${regexPattern}$`);
  const match = normalizedPath.match(regex);

  if (!match) return null;

  const params: RouteParams = {};
  paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1]);
  });

  return { params, isMatch: true };
};

/**
 * Parse query string into object
 */
const parseQueryParams = (search: string): QueryParams => {
  const searchParams = new URLSearchParams(search);
  const query: QueryParams = {};
  for (const [key, value] of searchParams.entries()) {
    query[key] = value;
  }
  return query;
};

/**
 * Custom error boundary for router
 */
class RouterErrorBoundary extends React.Component<
  RouterErrorBoundaryProps,
  { hasError: boolean; error: Error | null }
> {
  constructor(props: RouterErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Router error:", error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (typeof this.props.fallback === "function") {
        return (this.props.fallback as Function)(
          this.state.error,
          this.resetError
        );
      }
      return this.props.fallback;
    }

    return this.props.children;
  }
}

/**
 * Router Provider component
 */
export const RouterProvider: FC<RouterProviderProps> = ({
  children,
  errorFallback = (
    <div>Something went wrong with routing. Please refresh the page.</div>
  ),
  basename = "",
}) => {
  const [location, setLocation] = useState<RouterLocation>({
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: window.history.state,
  });

  const queryParams = useMemo(
    () => parseQueryParams(location.search),
    [location.search]
  );

  const [currentParams, setCurrentParams] = useState<RouteParams>({});

  const normalizedBasename = useMemo(() => {
    if (!basename) return "";
    return basename.startsWith("/") ? basename : `/${basename}`;
  }, [basename]);

  const navigate = useCallback(
    (to: string, options: NavigateOptions = {}) => {
      const { replace = false, state = {} } = options;

      const fullPath = to.startsWith("/") ? `${normalizedBasename}${to}` : to;

      if (replace) {
        window.history.replaceState(state, "", fullPath);
      } else {
        window.history.pushState(state, "", fullPath);
      }

      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        state,
      });
    },
    [normalizedBasename]
  );

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      setLocation({
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        state: event.state,
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const contextValue = useMemo(
    () => ({
      location,
      navigate,
      queryParams,
      currentParams,
      setCurrentParams,
    }),
    [location, navigate, queryParams, currentParams]
  );

  return (
    <RouterErrorBoundary fallback={errorFallback}>
      <BasenameContext.Provider value={normalizedBasename}>
        <RouterContext.Provider value={contextValue}>
          {children}
        </RouterContext.Provider>
      </BasenameContext.Provider>
    </RouterErrorBoundary>
  );
};

/**
 * Link component
 */
export const A: FC<LinkProps> = ({
  to,
  children,
  replace = false,
  state = {},
  className,
  activeClassName,
  exact = true,
  ...props
}) => {
  const { location, navigate } = useRouter();
  const basename = useContext(BasenameContext);

  const fullPath = to.startsWith("/") ? `${basename}${to}` : to;

  const isActive = exact
    ? location.pathname === fullPath
    : location.pathname.startsWith(fullPath);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    navigate(to, { replace, state });
  };

  const combinedClassName =
    isActive && activeClassName
      ? `${className || ""} ${activeClassName}`.trim()
      : className;

  return (
    <a
      href={fullPath}
      onClick={handleClick}
      className={combinedClassName}
      {...props}
    >
      {children}
    </a>
  );
};

/**
 * NavLink component (A component with active state handling)
 */
export const NavLink: FC<LinkProps> = (props) => {
  return <A {...props} />;
};

/**
 * LazyRoute component for code splitting
 */
export const LazyRoute: FC<LazyRouteProps> = ({
  path,
  component,
  exact,
  fallback = <div>Loading...</div>,
  guard,
}) => {
  const LazyComponent = React.lazy(component);

  return (
    <Route
      path={path}
      exact={exact}
      guard={guard}
      element={
        <Suspense fallback={fallback}>
          <LazyComponent />
        </Suspense>
      }
    />
  );
};

/**
 * Routes component with Switch-like functionality
 */
export const Routes: FC<RoutesProps> = ({ children, fallback }) => {
  const { location, setCurrentParams } = useRouter();
  const basename = useContext(BasenameContext);

  const matchParamsRef = useRef<RouteParams>({});

  const pathWithoutBasename = useMemo(() => {
    if (basename && location.pathname.startsWith(basename)) {
      return location.pathname.slice(basename.length) || "/";
    }
    return location.pathname;
  }, [location.pathname, basename]);

  const routes = useMemo(() => {
    return React.Children.toArray(children).filter(
      (child): child is ReactElement<RouteProps> => React.isValidElement(child)
    );
  }, [children]);

  const [matchingRoute, setMatchingRoute] =
    useState<ReactElement<RouteProps> | null>(null);
  const [isProcessingGuard, setIsProcessingGuard] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsProcessingGuard(true);

    const processRoutes = async () => {
      let foundRoute: ReactElement<RouteProps> | null = null;
      let foundParams: RouteParams = {};

      const checkRouteAndGuard = async (route: ReactElement<RouteProps>) => {
        if (!route.props.path) return false;

        const match = matchPath(route.props.path, pathWithoutBasename);
        if (!match?.isMatch) return false;

        if (route.props.exact && pathWithoutBasename !== route.props.path)
          return false;

        if (route.props.guard) {
          try {
            const guardResult = route.props.guard(match.params);
            if (guardResult instanceof Promise) {
              const allowed = await guardResult;
              return allowed ? match : false;
            }
            return guardResult ? match : false;
          } catch (error) {
            console.error("Route guard error:", error);
            return false;
          }
        }

        return match;
      };

      for (const route of routes) {
        if (route.props.exact !== false) {
          const result = await checkRouteAndGuard(route);
          if (result) {
            foundRoute = route;
            foundParams = result.params;
            break;
          }
        }
      }

      if (!foundRoute) {
        for (const route of routes) {
          if (route.props.exact === false) {
            const result = await checkRouteAndGuard(route);
            if (result) {
              foundRoute = route;
              foundParams = result.params;
              break;
            }
          }
        }
      }

      if (!foundRoute) {
        foundRoute =
          routes.find((route) => route.props.notFound === true) || null;
        foundParams = {};
      }

      if (isMounted) {
        matchParamsRef.current = foundParams;
        setCurrentParams(foundParams);
        setMatchingRoute(foundRoute);
        setIsProcessingGuard(false);
      }
    };

    processRoutes();

    return () => {
      isMounted = false;
    };
  }, [routes, pathWithoutBasename, setCurrentParams]);

  return (
    <RoutesContext.Provider value={routes}>
      <Suspense fallback={fallback || <div>Loading route...</div>}>
        {isProcessingGuard ? (
          <div style={{ display: "none" }}>Processing route guards...</div>
        ) : matchingRoute ? (
          matchingRoute
        ) : null}
      </Suspense>
    </RoutesContext.Provider>
  );
};

/**
 * Route component
 */
export const Route: FC<RouteProps> = ({
  path,
  element,
  exact,
  notFound,
  guard,
  children,
}) => {
  const { location } = useRouter();
  const basename = useContext(BasenameContext);

  const pathWithoutBasename = useMemo(() => {
    if (basename && location.pathname.startsWith(basename)) {
      return location.pathname.slice(basename.length) || "/";
    }
    return location.pathname;
  }, [location.pathname, basename]);

  const content = children || element;

  if (notFound && !path) {
    return <>{content}</>;
  }

  const match = path ? matchPath(path, pathWithoutBasename) : null;
  const isMatch = match?.isMatch;

  if (exact && !isMatch) {
    return null;
  }

  if (isMatch || !path) {
    if (typeof content === "function") {
      return <>{content(match?.params || {})}</>;
    }

    if (React.isValidElement(content)) {
      return React.cloneElement(content as React.ReactElement, {
        params: match?.params || {},
      });
    }

    return <>{content}</>;
  }

  return null;
};

/**
 * Outlet component for nested routes
 */
export const Outlet: FC<OutletProps> = ({ context = {} }) => {
  const outletContext = useContext(OutletContext);
  const mergedContext = { ...outletContext, ...context };

  return (
    <OutletContext.Provider value={mergedContext}>
      {outletContext.children}
    </OutletContext.Provider>
  );
};

/**
 * Hook to use router context
 */
export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error("useRouter must be used within a RouterProvider");
  }
  return context;
};

/**
 * Hook to get route parameters
 */
export const useParams = (): RouteParams => {
  const { currentParams } = useRouter();
  return currentParams || {};
};

/**
 * Hook to get query parameters
 */
export const useQueryParams = (): QueryParams => {
  const { queryParams } = useRouter();
  return queryParams;
};

/**
 * Hook to get location object
 */
export const useLocation = (): RouterLocation => {
  const { location } = useRouter();
  return location;
};

/**
 * Hook to get navigate function
 */
export const useNavigate = () => {
  const { navigate } = useRouter();
  return navigate;
};

/**
 * Navigate component for imperative navigation
 */
export const Navigate: FC<NavigateProps> = ({
  to,
  replace = false,
  state = {},
}) => {
  const { navigate } = useRouter();

  useEffect(() => {
    navigate(to, { replace, state });
  }, [to, replace, state, navigate]);

  return null;
};

/**
 * Redirect component (deprecated but included for compatibility)
 */
export const Redirect: FC<{ to: string; push?: boolean }> = ({
  to,
  push = false,
}) => {
  return <Navigate to={to} replace={!push} />;
};
