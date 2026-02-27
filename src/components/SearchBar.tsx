interface SearchBarProps {
    search: string;
    onSearchChange: (value: string) => void;
    filterType: string;
    onFilterTypeChange: (value: string) => void;
}

export default function SearchBar({
    search,
    onSearchChange,
    filterType,
    onFilterTypeChange,
}: SearchBarProps) {
    return (
        <div className="search-bar">
            <div className="search-input-wrapper">
                <span className="icon">🔍</span>
                <input
                    className="search-input"
                    type="text"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="搜索视频标题、描述、作者..."
                />
            </div>
            <select
                className="filter-select"
                value={filterType}
                onChange={(e) => onFilterTypeChange(e.target.value)}
            >
                <option value="">全部类型</option>
                <option value="local">📁 本地</option>
                <option value="youtube">▶️ YouTube</option>
                <option value="bilibili">📺 Bilibili</option>
            </select>
        </div>
    );
}
