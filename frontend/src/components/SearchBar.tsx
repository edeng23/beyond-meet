import { FC, useState, useEffect, useRef } from 'react';
import { GraphNode } from '../types/graph';

interface SearchBarProps {
    nodes: GraphNode[];
    onSearch: (term: string) => void;
    onNodeSelect: (node: GraphNode) => void;
}

interface Suggestion {
    node: GraphNode; z
    matchField: string;
    matchValue: string;
}

const SearchBar: FC<SearchBarProps> = ({ nodes, onSearch, onNodeSelect }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Handle clicks outside of the component
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getSuggestions = (value: string): Suggestion[] => {
        const inputValue = value.toLowerCase();
        const inputLength = inputValue.length;

        if (inputLength === 0) return [];

        const suggestions: Suggestion[] = [];
        const seenNodes = new Set<string>();  // Track nodes we've already added

        nodes.forEach(node => {
            // Check each searchable field
            const fields: [string, string][] = [
                ['name', node.name],
                ['email', node.email],
                ['company', node.company],
                ['lastName', node.lastName]
            ];

            let bestMatch: Suggestion | null = null;
            let bestMatchScore = -1;

            fields.forEach(([field, value]) => {
                if (value?.toLowerCase().includes(inputValue)) {
                    const score = getMatchScore(value.toLowerCase(), inputValue);
                    if (score > bestMatchScore) {
                        bestMatchScore = score;
                        bestMatch = {
                            node,
                            matchField: field,
                            matchValue: value
                        };
                    }
                }
            });

            // Only add the best match if we haven't seen this node before
            if (bestMatch && !seenNodes.has(bestMatch.node.id)) {
                suggestions.push(bestMatch);
                seenNodes.add(bestMatch.node.id);
            }
        });

        // Sort suggestions by relevance
        return suggestions
            .sort((a, b) => {
                const aValue = a.matchValue.toLowerCase();
                const bValue = b.matchValue.toLowerCase();

                if (aValue === inputValue) return -1;
                if (bValue === inputValue) return 1;
                if (aValue.startsWith(inputValue) && !bValue.startsWith(inputValue)) return -1;
                if (bValue.startsWith(inputValue) && !aValue.startsWith(inputValue)) return 1;
                return 0;
            })
            .slice(0, 5); // Limit to 5 suggestions
    };

    // Helper function to score how well a value matches the search term
    const getMatchScore = (value: string, search: string): number => {
        if (value === search) return 4;  // Exact match
        if (value.startsWith(search)) return 3;  // Starts with
        if (value.includes(` ${search}`)) return 2;  // Matches word boundary
        return 1;  // Contains anywhere
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchTerm(value);
        onSearch(value);
        setSuggestions(getSuggestions(value));
        setIsOpen(true);
    };

    const handleSuggestionClick = (suggestion: Suggestion) => {
        setSearchTerm(suggestion.matchValue);
        onSearch(suggestion.matchValue);
        onNodeSelect(suggestion.node);
        setIsOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                placeholder="Search connections..."
                value={searchTerm}
                onChange={handleInputChange}
                className="px-4 py-2 bg-gray-800 text-white rounded border border-gray-700 
                         focus:outline-none focus:border-blue-500 w-64"
            />
            {searchTerm && (
                <button
                    onClick={() => {
                        setSearchTerm('');
                        onSearch('');
                        setSuggestions([]);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 
                             hover:text-white"
                >
                    ✕
                </button>
            )}
            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 
                              rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={`${suggestion.node.id}-${index}`}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-4 py-2 hover:bg-gray-700 cursor-pointer"
                        >
                            <div className="text-white">{suggestion.matchValue}</div>
                            <div className="text-sm text-gray-400">
                                {/* Show name and email info */}
                                {suggestion.node.firstName && suggestion.node.lastName ? (
                                    <span>{suggestion.node.firstName} {suggestion.node.lastName} • </span>
                                ) : suggestion.node.name && suggestion.node.name !== suggestion.node.email ? (
                                    <span>{suggestion.node.name} • </span>
                                ) : null}
                                <span>{suggestion.node.email}</span>
                                {suggestion.node.company && suggestion.matchField !== 'company' && (
                                    <span className="ml-2 text-gray-500">• {suggestion.node.company}</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBar; 