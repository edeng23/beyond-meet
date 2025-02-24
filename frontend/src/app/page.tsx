'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import NodeDetailsPanel from '../components/NodeDetailsPanel';
import SearchBar from '../components/SearchBar';

// Define types for graph data
interface GraphNode {
    id: string;
    name: string;
    email: string;
    company: string;
    companyDomain: string;
    firstName: string;
    lastName: string;
    linkedinUrl: string;
    notes: string;
    meetings: Array<{
        date: string;
        title: string;
        location: string;
    }>;
    // Force-directed graph properties
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

// Add a type for complex source/target objects
interface GraphNodeRef {
    id: string;
    [key: string]: any;  // Allow other properties
}

interface GraphLink {
    source: string | GraphNodeRef;
    target: string | GraphNodeRef;
}

interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
    is_generating?: boolean;
}

// Add search state and helper function
function matchesSearch(node: GraphNode, searchTerm: string): boolean {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
        node.email.toLowerCase().includes(search) ||
        node.name.toLowerCase().includes(search) ||
        node.lastName.toLowerCase().includes(search) ||
        node.company.toLowerCase().includes(search)
    );
}

// First, let's modify getConnectedNodes to handle both string and object node IDs
function getConnectedNodes(nodeId: string, links: GraphLink[]): Set<string> {
    const connected = new Set<string>();
    links.forEach(link => {
        // Handle both string and object source/target with proper typing
        const source = typeof link.source === 'string' ? link.source : link.source.id;
        const target = typeof link.target === 'string' ? link.target : link.target.id;

        if (source === nodeId) connected.add(target);
        if (target === nodeId) connected.add(source);
    });
    return connected;
}

function shouldHighlightLink(
    link: GraphLink,  // Use GraphLink type instead of any
    searchTerm: string,
    graphData: GraphData
): boolean {
    if (!searchTerm) return true;

    // Get source and target IDs with proper typing
    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    // Find the actual nodes
    const sourceNode = graphData.nodes.find(n => n.id === sourceId);
    const targetNode = graphData.nodes.find(n => n.id === targetId);
    if (!sourceNode || !targetNode) return false;

    // If either node matches the search term directly
    if (matchesSearch(sourceNode, searchTerm) || matchesSearch(targetNode, searchTerm)) {
        return true;
    }

    // Get all matching nodes
    const matchingNodeIds = graphData.nodes
        .filter(n => matchesSearch(n, searchTerm))
        .map(n => n.id);

    // For each matching node, get its connections
    const connectedToMatchingNodes = new Set<string>();
    matchingNodeIds.forEach(matchingId => {
        getConnectedNodes(matchingId, graphData.links).forEach(id =>
            connectedToMatchingNodes.add(id)
        );
    });

    // Highlight if either node is connected to a matching node
    return connectedToMatchingNodes.has(sourceId) || connectedToMatchingNodes.has(targetId);
}

// Add these optimized helper functions at the top
function getNodeColor(node: GraphNode, searchTerm: string, connectedToMatching: Set<string>, clickedNodeId: string | null): string {
    if (!searchTerm && !clickedNodeId) return '#60a5fa';  // Default light blue

    // Direct match (either by search or click)
    if ((searchTerm && matchesSearch(node, searchTerm)) || node.id === clickedNodeId) {
        return '#60a5fa';  // Light blue for direct matches
    }

    // Connected nodes
    if (connectedToMatching.has(node.id)) {
        return '#3874c9';  // More faded blue for neighbors
    }

    return '#1f2937';  // Dark gray for non-matching nodes
}

function getLinkColor(link: GraphLink, searchTerm: string, matchingNodes: Set<string>, clickedNodeId: string | null): string {
    if (!searchTerm && !clickedNodeId) return 'rgba(255, 255, 255, 0.2)';

    const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
    const targetId = typeof link.target === 'string' ? link.target : link.target.id;

    if (matchingNodes.has(sourceId) || matchingNodes.has(targetId)) {
        return 'rgba(255, 255, 255, 0.6)';  // Brighter links for matches
    }

    return 'rgba(255, 255, 255, 0.05)';
}

// Add this constant at the top of the file
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Add new interface for user info
interface UserInfo {
    id: string;
    email: string;
    picture: string;
    name: string;
}

// Update the LoadingScreen component
function LoadingScreen({ progress }: { progress: number }) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <div className="w-96 space-y-6">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold">Analyzing Your Network</h2>
                    <p className="text-gray-400">
                        {progress < 30 && "Fetching your email interactions..."}
                        {progress >= 30 && progress < 60 && "Processing connections..."}
                        {progress >= 60 && progress < 90 && "Building your network graph..."}
                        {progress >= 90 && "Finalizing visualization..."}
                    </p>
                </div>

                {/* Progress bar container */}
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Progress percentage */}
                <div className="flex justify-between text-sm text-gray-400">
                    <span>{progress}% Complete</span>
                </div>

                {/* Loading animation */}
                <div className="flex justify-center space-x-2">
                    {[...Array(3)].map((_, i) => (
                        <div
                            key={i}
                            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                            style={{
                                animationDelay: `${i * 0.15}s`,
                                animationDuration: '0.8s'
                            }}
                        />
                    ))}
                </div>

                {/* Tips carousel */}
                <div className="mt-8 p-4 bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-300 text-center">
                        💡 Tip: You can search through your network using the search bar
                        once the graph is ready
                    </p>
                </div>
            </div>
        </div>
    );
}

const LoadingGraph = () => (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-center">
            <h2>Loading graph visualization...</h2>
        </div>
    </div>
);

const ForceGraph2D = dynamic(
    () => import('react-force-graph-2d').then((mod) => mod.default),
    {
        ssr: false,
        loading: LoadingGraph
    }
);

export default function Page() {
    return (
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''}>
            <PageContent />
        </GoogleOAuthProvider>
    );
}

function PageContent() {
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const eventSourceRef = useRef<EventSource | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [clickedNodeId, setClickedNodeId] = useState<string | null>(null);

    // Load session from localStorage on mount
    useEffect(() => {
        const savedUserInfo = localStorage.getItem('userInfo');
        if (savedUserInfo) {
            const parsedInfo = JSON.parse(savedUserInfo);
            setUserInfo(parsedInfo);
            setAccessToken(parsedInfo.id);
        }
    }, []);

    // Update the login success handler to save to localStorage
    const login = useGoogleLogin({
        flow: 'auth-code',
        scope: 'openid https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly',
        onSuccess: async (codeResponse) => {
            console.log('Login successful:', codeResponse);
            try {
                const response = await fetch(`${API_URL}/api/auth_code`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        code: codeResponse.code,
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    console.error('Auth error:', errorData);
                    throw new Error(errorData.detail || 'Authentication failed');
                }

                const data = await response.json();
                console.log('Auth success (server tokens):', data);

                const userInfo = {
                    id: data.user_id,
                    email: data.email,
                    picture: data.picture,
                    name: data.name,
                };

                localStorage.setItem('userInfo', JSON.stringify(userInfo));
                setUserInfo(userInfo);
                setAccessToken(data.user_id);
            } catch (error) {
                console.error('Auth error:', error);
                setError((error as Error).message);
            }
        },
        onError: () => {
            console.error('Login Failed');
            setError('Login failed. Please try again.');
        },
    });

    useEffect(() => {
        const handleResize = () => {
            setDimensions({
                width: window.innerWidth,
                height: window.innerHeight
            });
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load or create a graph (sync if none in DB) on page load
    const seeGraph = async () => {
        try {
            console.log('Loading graph (or auto-creating if none found)...');
            if (!accessToken) {
                console.error('No access token available');
                setError('Please login first');
                return;
            }

            const res = await fetch(`${API_URL}/api/graph?user_id=${accessToken}`);
            if (!res.ok) {
                const errorData = await res.json();

                // If session expired, clear storage and trigger re-login
                if (res.status === 401) {
                    localStorage.removeItem('userInfo');
                    setUserInfo(null);
                    setAccessToken(null);
                    setError('Session expired. Please login again.');
                    return;
                }

                setError(errorData.detail || res.statusText);
                return;
            }
            const data = await res.json();
            setGraphData(data);
            setError(null);  // Clear any existing errors
        } catch (err: any) {
            console.error('Error loading graph:', err);
            setError(err.message);
        }
    };

    // Update the fetchGraph function to handle empty graphs better
    const fetchGraph = async () => {
        try {
            if (!accessToken) {
                throw new Error('No access token available');
            }

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/graph?user_id=${accessToken}`,
                {
                    credentials: 'include',  // Important for session cookies
                }
            );

            if (!response.ok) {
                if (response.status === 401) {
                    // Session expired, clear storage and trigger re-login
                    localStorage.removeItem('userInfo');
                    setUserInfo(null);
                    setAccessToken(null);
                    throw new Error('Session expired. Please login again.');
                }
                throw new Error('Failed to fetch graph');
            }

            const data = await response.json();
            setGraphData(data);

            // If graph is being generated, update the progress and connect to SSE
            if (data.is_generating) {
                setIsGenerating(true);
                // Set the initial progress from the server response
                if (data.current_progress !== undefined) {
                    setProgress(data.current_progress);
                }
                connectProgressSSE();
            } else {
                setIsGenerating(false);

                // If the graph is empty (no nodes/links), automatically generate one
                if ((!data.nodes || data.nodes.length === 0) && (!data.links || data.links.length === 0)) {
                    console.log('Empty graph detected, automatically generating...');
                    generateGraph();
                }
            }
        } catch (error) {
            console.error('Error fetching graph:', error);
            setError(error.message);
        }
    };

    // Improve the SSE connection function
    function connectProgressSSE() {
        // Close any existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        const eventSource = new EventSource(
            `${process.env.NEXT_PUBLIC_API_URL}/api/graph/progress?user_id=${accessToken}`
        );
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.progress !== undefined && data.progress !== 'keep-alive') {
                    setProgress(data.progress);

                    // When progress reaches 100%, close the connection and fetch the final graph
                    if (data.progress >= 100) {
                        console.log('Progress complete, closing SSE connection');
                        eventSource.close();
                        eventSourceRef.current = null;

                        // Set a small delay before fetching the graph to ensure backend processing is complete
                        setTimeout(() => {
                            setIsGenerating(false);
                            fetchGraph();
                        }, 1000);
                    }
                }
            } catch (error) {
                console.error('Error parsing progress data:', error);
            }
        };

        eventSource.onerror = (error) => {
            console.error('EventSource error:', error);

            // Don't immediately close on error - try to reconnect
            setTimeout(() => {
                if (isGenerating) {
                    console.log('Attempting to reconnect to progress stream...');
                    connectProgressSSE();
                } else {
                    if (eventSourceRef.current) {
                        eventSourceRef.current.close();
                        eventSourceRef.current = null;
                    }
                }
            }, 2000);
        };
    }

    // Update the generateGraph function to handle the SSE connection properly
    const generateGraph = async () => {
        try {
            setIsGenerating(true);
            setProgress(0);
            setError(null);

            // Start the progress event source before triggering graph generation
            connectProgressSSE();

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/graph?user_id=${accessToken}`,
                {
                    method: 'POST',
                    credentials: 'include',
                }
            );

            if (!response.ok) {
                if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                }
                setIsGenerating(false);
                throw new Error('Failed to generate graph');
            }

        } catch (error) {
            console.error('Error generating graph:', error);
            setError(error.message);
            setIsGenerating(false);
        }
    };

    // Fetch graph on mount and when accessToken changes
    useEffect(() => {
        if (accessToken) {
            fetchGraph();
        }
    }, [accessToken]);

    // Make sure to clean up the SSE connection when the component unmounts
    useEffect(() => {
        return () => {
            // Cleanup SSE connection when component unmounts
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
                eventSourceRef.current = null;
            }
        };
    }, []);

    // Add memoized search results
    const searchResults = useMemo(() => {
        if ((!searchTerm && !clickedNodeId) || !graphData.nodes) return {
            matchingNodes: new Set<string>(),
            connectedToMatching: new Set<string>()
        };

        const matchingNodes = new Set<string>();
        const connectedToMatching = new Set<string>();

        // First pass: find matching nodes
        if (searchTerm) {
            graphData.nodes.forEach(node => {
                if (matchesSearch(node, searchTerm)) {
                    matchingNodes.add(node.id);
                }
            });
        } else if (clickedNodeId) {
            matchingNodes.add(clickedNodeId);
        }

        // Second pass: find connected nodes (only if we have matches)
        if (matchingNodes.size > 0) {
            graphData.links.forEach(link => {
                const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
                const targetId = typeof link.target === 'string' ? link.target : link.target.id;

                if (matchingNodes.has(sourceId)) {
                    connectedToMatching.add(targetId);
                }
                if (matchingNodes.has(targetId)) {
                    connectedToMatching.add(sourceId);
                }
            });
        }

        return { matchingNodes, connectedToMatching };
    }, [searchTerm, clickedNodeId, graphData]);

    // Update the node click handler
    const handleNodeClick = (node: GraphNode) => {
        console.log('Node clicked:', node);
        setSearchTerm('');  // Clear search bar
        setClickedNodeId(node.id);  // Set clicked node for highlighting
        setSelectedNode(node);
    };

    // Add a logout function
    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        setUserInfo(null);
        setAccessToken(null);
        setGraphData({ nodes: [], links: [] });
    };

    if (!accessToken) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
                <div className="max-w-md w-full space-y-8 bg-white/5 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/10">
                    <div className="text-center">
                        <h1 className="text-4xl font-bold text-white mb-2">Beyond Meet</h1>
                        <div className="h-1 w-12 bg-blue-500 mx-auto mb-6"></div>
                        <p className="text-gray-400 text-lg mb-8">
                            Visualize your professional network through email interactions
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white/5 rounded-lg p-4 text-sm text-gray-300">
                            <ul className="space-y-2">
                                <li className="flex items-center">
                                    <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Analyze email interactions
                                </li>
                                <li className="flex items-center">
                                    <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Discover hidden connections
                                </li>
                                <li className="flex items-center">
                                    <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    Interactive network visualization
                                </li>
                            </ul>
                        </div>

                        <button
                            onClick={() => login()}
                            className="w-full flex items-center justify-center px-4 py-3 border border-transparent 
                                     text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 
                                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                                     transition-colors duration-200"
                        >
                            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"
                                />
                            </svg>
                            Sign in with Google
                        </button>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
                                <div className="flex items-center">
                                    <svg className="h-5 w-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                        <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                    </svg>
                                    {error}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 text-center text-sm text-gray-400">
                        <p>By signing in, you agree to our</p>
                        <div className="space-x-4 mt-2">
                            <a href="#" className="hover:text-blue-400 transition-colors duration-200">Privacy Policy</a>
                            <span>&middot;</span>
                            <a href="#" className="hover:text-blue-400 transition-colors duration-200">Terms of Service</a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-2xl mb-4">Error</h1>
                    <p className="mb-4">{error}</p>
                    <button
                        onClick={generateGraph}
                        disabled={isGenerating}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded disabled:opacity-50"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (isGenerating) {
        return <LoadingScreen progress={progress} />;
    }

    // If we have no graphData yet (nodes/links empty) => show a "Generate" prompt
    const isEmptyGraph = !graphData || (!graphData.nodes?.length && !graphData.links?.length);

    if (isEmptyGraph) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
                <div className="text-center">
                    <h1 className="text-2xl mb-4">Welcome to Beyond Meet</h1>
                    <p className="mb-4">
                        Generate your social connection graph from your email history.
                    </p>
                    <button
                        onClick={generateGraph}
                        className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded"
                    >
                        Generate Graph
                    </button>
                </div>
            </div>
        );
    }

    // Otherwise, show the Force Graph (or whatever visual)
    return (
        <main className="w-screen h-screen bg-gray-900">
            <div className="absolute top-4 left-4 z-10 flex items-center gap-4">
                <SearchBar
                    nodes={graphData.nodes}
                    onSearch={(term) => {
                        setSearchTerm(term);
                        setClickedNodeId(null);  // Clear clicked node when searching
                    }}
                    onNodeSelect={(node) => {
                        setSelectedNode(node);
                        setClickedNodeId(node.id);
                        setSearchTerm('');
                    }}
                />
                <button
                    onClick={generateGraph}
                    disabled={isGenerating}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded text-white 
                             disabled:opacity-50"
                >
                    Regenerate Graph
                </button>

                {/* Add user info display */}
                {userInfo && (
                    <div className="flex items-center gap-2">
                        <span className="text-white">{userInfo.name}</span>
                        <div className="relative group">
                            <img
                                src={userInfo.picture}
                                alt={userInfo.name}
                                className="w-8 h-8 rounded-full cursor-pointer"
                            />
                            <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-800 rounded-lg shadow-xl 
                                          opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <div className="px-4 py-2 text-sm text-white">
                                    <div className="font-medium">{userInfo.name}</div>
                                    <div className="text-gray-400">{userInfo.email}</div>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2 text-sm text-red-400 
                                             hover:bg-gray-700 transition-colors duration-200"
                                >
                                    Sign out
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <span className="text-white">
                    {isGenerating ? `Progress: ${progress}%` : null}
                </span>
            </div>
            <div style={{ width: '100%', height: '100vh' }}>
                <ForceGraph2D
                    graphData={graphData}
                    nodeId="id"
                    linkSource="source"
                    linkTarget="target"
                    width={dimensions.width}
                    height={dimensions.height}
                    nodeColor={(node: any) =>
                        getNodeColor(node, searchTerm, searchResults.connectedToMatching, clickedNodeId)
                    }
                    linkColor={(link: GraphLink) =>
                        getLinkColor(link, searchTerm, searchResults.matchingNodes, clickedNodeId)
                    }
                    nodeLabel="name"
                    backgroundColor="#111827"
                    // Physics and interaction settings
                    enableNodeDrag={true}
                    nodeRelSize={6}
                    linkWidth={1}
                    warmupTicks={100}
                    cooldownTicks={100}
                    cooldownTime={3000}
                    d3VelocityDecay={0.3}
                    d3AlphaMin={0.001}
                    d3AlphaDecay={0.02}
                    // Additional visual settings
                    nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                        const label = node.name;
                        const fontSize = 12 / globalScale;
                        ctx.font = `${fontSize}px Sans-Serif`;
                        const color = getNodeColor(node, searchTerm, searchResults.connectedToMatching, clickedNodeId);

                        // Add glow effect for matching nodes
                        if ((searchTerm || clickedNodeId) && searchResults.matchingNodes.has(node.id)) {
                            ctx.shadowColor = color;
                            ctx.shadowBlur = 15;
                        } else {
                            ctx.shadowColor = 'transparent';
                            ctx.shadowBlur = 0;
                        }

                        ctx.fillStyle = color;
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, 5, 0, 2 * Math.PI, false);
                        ctx.fill();

                        // Reset shadow after drawing
                        ctx.shadowColor = 'transparent';
                        ctx.shadowBlur = 0;
                    }}
                    onNodeClick={(node: any) => handleNodeClick(node as GraphNode)}
                />
            </div>
            <NodeDetailsPanel
                node={selectedNode}
                onClose={() => setSelectedNode(null)}
                userId={accessToken}
            />
        </main>
    );
}
