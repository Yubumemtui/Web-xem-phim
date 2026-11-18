"use client";

import { useState, useEffect } from "react";
import { X, SlidersHorizontal, ChevronDown, ChevronUp, Filter, RotateCcw } from "lucide-react";
import type { Genre, Country } from "@/types/api";

const NAM_PHAT_HANH = Array.from({ length: 30 }, (_, i) => 2024 - i).map(year => ({ name: year.toString(), slug: year.toString() }));

const DANH_SACH_LIST = [
  { name: "Phim Mới", slug: "phim-moi" },
  { name: "Phim Bộ", slug: "phim-bo" },
  { name: "Phim Lẻ", slug: "phim-le" },
  { name: "Shows", slug: "tv-shows" },
  { name: "Hoạt Hình", slug: "hoat-hinh" },
  { name: "Phim Vietsub", slug: "phim-vietsub" },
  { name: "Phim Thuyết Minh", slug: "phim-thuyet-minh" },
  { name: "Phim Lồng Tiếng", slug: "phim-long-tieng" },
  { name: "Phim Bộ Đang Chiếu", slug: "phim-bo-dang-chieu" },
  { name: "Phim Bộ Đã Hoàn Thành", slug: "phim-bo-hoan-thanh" },
  { name: "Subteam", slug: "subteam" },
  { name: "Phim Chiếu Rạp", slug: "phim-chieu-rap" }
];

const PHIEN_BAN_LIST = [
  { name: "Phụ đề", slug: "phim-vietsub" },
  { name: "Thuyết minh", slug: "phim-thuyet-minh" },
  { name: "Lồng tiếng", slug: "phim-long-tieng" }
];

const SAP_XEP_LIST = [
  { name: "Mới cập nhật", slug: "modified.time" },
  { name: "Thời gian đăng", slug: "_id" },
  { name: "Năm sản xuất", slug: "year" }
];

interface FilterPanelProps {
  theLoaiList: Genre[];
  quocGiaList: Country[];
  initialFilters?: {
    theLoaiSlug?: string;
    quocGiaSlug?: string;
    year?: string;
    loaiPhim?: string;
    phienBan?: string;
    danhSach?: string;
    sortField?: string;
    sortType?: string;
  };
  onFilterChange: (filters: {
    theLoai?: string;
    quocGia?: string;
    year?: string;
    loaiPhim?: string;
    phienBan?: string;
    danhSach?: string;
    sortField?: string;
    sortType?: string;
  }) => void;
}

type FilterState = {
  theLoaiSlug?: string;
  quocGiaSlug?: string;
  year?: string;
  loaiPhim?: string;
  phienBan?: string;
  danhSach?: string;
  sortField?: string;
  sortType?: string;
};

type FilterKey = keyof FilterState;

interface FilterSection {
  title: string;
  type: FilterKey;
  items: { name: string; slug: string }[];
  isAccordion?: boolean;
  multi?: boolean;
}

export default function FilterPanel({ theLoaiList, quocGiaList, initialFilters, onFilterChange }: FilterPanelProps) {
  const [selectedFilters, setSelectedFilters] = useState<FilterState>({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopOpen, setIsDesktopOpen] = useState(true);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['danhSach', 'quocGia', 'theLoai']));

  useEffect(() => {
    if (initialFilters) {
      setSelectedFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleFilterSelect = (
    type: FilterKey,
    value: string,
    multi: boolean = false
  ) => {
    let newFilters: FilterState;
    if (multi) {
      const current = (selectedFilters[type] || "").split(",").filter(Boolean);
      const next = current.includes(value)
        ? current.filter((s) => s !== value)
        : [...current, value];
      newFilters = {
        ...selectedFilters,
        [type]: next.length > 0 ? next.join(",") : undefined,
      };
    } else {
      const newVal = selectedFilters[type] === value ? undefined : value;
      newFilters = {
        ...selectedFilters,
        [type]: newVal,
      };
    }
    setSelectedFilters(newFilters);
    
    onFilterChange({
      theLoai: newFilters.theLoaiSlug,
      quocGia: newFilters.quocGiaSlug,
      year: newFilters.year,
      loaiPhim: newFilters.loaiPhim,
      phienBan: newFilters.phienBan,
      danhSach: newFilters.danhSach,
      sortField: newFilters.sortField,
      sortType: newFilters.sortType,
    });
  };

  const clearAllFilters = () => {
    setSelectedFilters({});
    onFilterChange({});
  };

  const hasActiveFilters = Object.values(selectedFilters).some(
    (value) => value !== undefined
  );

  const activeCount = Object.entries(selectedFilters).reduce((sum, [key, value]) => {
    if (!value) return sum;
    if (key === "theLoaiSlug" || key === "quocGiaSlug") {
      return sum + value.split(",").filter(Boolean).length;
    }
    return sum + 1;
  }, 0);

  const toggleSection = (sectionKey: string) => {
    const newOpen = new Set(openSections);
    if (newOpen.has(sectionKey)) {
      newOpen.delete(sectionKey);
    } else {
      newOpen.add(sectionKey);
    }
    setOpenSections(newOpen);
  };

  const renderFilterSection = (section: FilterSection) => {
    const isOpen = openSections.has(section.type);
    const selectedValues = (selectedFilters[section.type] || "")
      .split(",")
      .filter(Boolean);
    const selectionCount = selectedValues.length;
    const hasSelection = selectionCount > 0;

    return (
      <div key={section.type} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
        <button
          onClick={() => toggleSection(section.type)}
          className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {section.title}
            </span>
            {hasSelection && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-semibold">
                {selectionCount}
              </span>
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>
        
        {isOpen && (
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {section.items.map((item) => {
                const isSelected = selectedValues.includes(item.slug);
                return (
                  <button
                    key={item.slug}
                    onClick={() => handleFilterSelect(section.type, item.slug, section.multi)}
                    className={`text-xs sm:text-sm py-2 px-3 rounded-lg border transition-all duration-200 text-left ${
                      isSelected
                        ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/20'
                        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSortSection = () => {
    const isOpen = openSections.has('sortField');
    const hasSelection = selectedFilters.sortField !== undefined;

    return (
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => toggleSection('sortField')}
          className="w-full flex items-center justify-between py-3 px-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Sắp xếp
            </span>
            {hasSelection && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>
        
        {isOpen && (
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {SAP_XEP_LIST.map((item) => {
                const isSelected = selectedFilters.sortField === item.slug;
                const isDesc = selectedFilters.sortType === 'desc' || (!selectedFilters.sortType && isSelected);
                
                return (
                  <div key={item.slug} className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newSortField = selectedFilters.sortField === item.slug ? undefined : item.slug;
                        const newSortType = newSortField ? (selectedFilters.sortType === 'desc' ? 'asc' : 'desc') : undefined;
                        const newFilters = {
                          ...selectedFilters,
                          sortField: newSortField,
                          sortType: newSortType
                        };
                        setSelectedFilters(newFilters);
                        onFilterChange({
                          theLoai: newFilters.theLoaiSlug,
                          quocGia: newFilters.quocGiaSlug,
                          year: newFilters.year,
                          loaiPhim: newFilters.loaiPhim,
                          phienBan: newFilters.phienBan,
                          danhSach: newFilters.danhSach,
                          sortField: newSortField,
                          sortType: newSortType
                        });
                      }}
                      className={`flex-1 text-left py-2.5 px-3 rounded-lg border transition-all duration-200 text-sm ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/20'
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400'
                      }`}
                    >
                      {item.name}
                    </button>
                    {isSelected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const newSortType = selectedFilters.sortType === 'desc' ? 'asc' : 'desc';
                          const newFilters = {
                            ...selectedFilters,
                            sortType: newSortType
                          };
                          setSelectedFilters(newFilters);
                          onFilterChange({
                            theLoai: newFilters.theLoaiSlug,
                            quocGia: newFilters.quocGiaSlug,
                            year: newFilters.year,
                            loaiPhim: newFilters.loaiPhim,
                            phienBan: newFilters.phienBan,
                            danhSach: newFilters.danhSach,
                            sortField: newFilters.sortField,
                            sortType: newSortType
                          });
                        }}
                        className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                        title={isDesc ? "Cũ nhất" : "Mới nhất"}
                      >
                        {isDesc ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const sections: FilterSection[] = [
    { title: "Danh sách", type: "danhSach", items: DANH_SACH_LIST },
    { title: "Quốc gia", type: "quocGiaSlug", items: quocGiaList, multi: true },
    { title: "Thể loại", type: "theLoaiSlug", items: theLoaiList, multi: true },
    { title: "Phiên bản", type: "phienBan", items: PHIEN_BAN_LIST },
    { title: "Năm phát hành", type: "year", items: NAM_PHAT_HANH },
  ];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-10">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Bộ lọc</h3>
              {activeCount > 0 && (
                <p className="text-xs text-gray-500 dark:text-gray-400">{activeCount} bộ lọc đang hoạt động</p>
              )}
            </div>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Toggle */}
      <div className="lg:hidden border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {isMobileOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}
          </span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isMobileOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Filter Sections */}
      <div className={`max-h-[60vh] lg:max-h-none overflow-y-auto lg:overflow-visible ${
        isMobileOpen ? 'block' : 'hidden lg:block'
      }`}>
        {sections.map(renderFilterSection)}
        {renderSortSection()}
      </div>
    </div>
  );
}
