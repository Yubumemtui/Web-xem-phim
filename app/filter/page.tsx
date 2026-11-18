"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import FilterPanel from "@/components/FilterPanel";
import MovieCard from "@/components/MovieCard";
import SectionTitle from "@/components/SectionTitle";
import Pagination from "@/components/Pagination";
import { getDanhSach, getTheLoaiDetails, getQuocGiaDetails, getTheLoai, getQuocGia, getPhimMoi } from "@/lib/api";
import type { MovieListResponse, Genre, Country, Movie } from "@/types/api";

const DANH_MUC_LIST = [
  { name: "Phim mới", slug: "phim-moi" },
  { name: "Phim bộ", slug: "phim-bo" },
  { name: "Phim lẻ", slug: "phim-le" },
  { name: "Shows", slug: "tv-shows" },
  { name: "Hoạt hình", slug: "hoat-hinh" },
  { name: "Phim vietsub", slug: "phim-vietsub" },
  { name: "Phim thuyết minh", slug: "phim-thuyet-minh" },
  { name: "Phim lồng tiếng", slug: "phim-long-tieng" },
  { name: "Phim bộ đang chiếu", slug: "phim-bo-dang-chieu" },
  { name: "Phim bộ đã hoàn thành", slug: "phim-bo-hoan-thanh" },
  { name: "Phim sắp chiếu", slug: "phim-sap-chieu" },
  { name: "Subteam", slug: "subteam" },
  { name: "Phim chiếu rạp", slug: "phim-chieu-rap" },
];

function FilterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined') {
      const prevBrowse = sessionStorage.getItem("prev_browse_page");
      if (prevBrowse) {
        router.push(prevBrowse);
        return;
      }
    }
    router.push("/");
  };
  const [movies, setMovies] = useState<MovieListResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<{ theLoai?: string; quocGia?: string; year?: string; loaiPhim?: string; phienBan?: string; danhSach?: string; sortField?: string; sortType?: string }>({});
  const [title, setTitle] = useState("Bộ Lọc Phim");
  const [theLoaiList, setTheLoaiList] = useState<Genre[]>([]);
  const [quocGiaList, setQuocGiaList] = useState<Country[]>([]);
  const [andExhausted, setAndExhausted] = useState(false);
  const fetchIdRef = useRef(0);
  const andRef = useRef({ sig: "", cursor: 1, exhausted: false, busy: false, items: [] as Movie[] });


  const updateTitle = useCallback(() => {
    const parts: string[] = [];
    if (filters.loaiPhim) parts.push(filters.loaiPhim);
    if (filters.phienBan) parts.push(filters.phienBan);
    const resolveNames = (slugs: string | undefined, list: { slug: string; name: string }[]) =>
      (slugs || "")
        .split(",")
        .filter(Boolean)
        .map((s) => list.find((t) => t.slug === s)?.name || s)
        .join(", ");
    const theLoaiNames = resolveNames(filters.theLoai, theLoaiList);
    if (theLoaiNames) parts.push(theLoaiNames);
    const quocGiaNames = resolveNames(filters.quocGia, quocGiaList);
    if (quocGiaNames) parts.push(quocGiaNames);
    if (filters.year) parts.push(filters.year);
    setTitle(parts.length > 0 ? parts.join(" - ") : "Bộ Lọc Phim");
  }, [filters, theLoaiList, quocGiaList]);

  // Gọi 1 trang API theo endpoint phù hợp với filter hiện tại
  const fetchListPage = useCallback(async (page: number): Promise<MovieListResponse | null> => {
    const danhMucSlug = filters.danhSach || filters.loaiPhim || filters.phienBan || "phim-moi";

    const queryParams: any = {
      page,
      limit: 30,
      category: filters.theLoai,
      country: filters.quocGia,
      year: filters.year,
      sort_field: filters.sortField,
      sort_type: filters.sortType || (filters.sortField ? "desc" : undefined)
    };

    const hasAnyFilter = filters.theLoai || filters.quocGia || filters.year || filters.sortField;
    const hasMultiValue =
      filters.theLoai?.includes(",") || filters.quocGia?.includes(",");

    if (filters.danhSach || filters.loaiPhim || filters.phienBan) {
      if (danhMucSlug === "phim-moi" && !hasAnyFilter) {
        const res = await getPhimMoi(page, 30);
        return res?.data || null;
      }
      const res = await getDanhSach(danhMucSlug, queryParams);
      return res?.data || null;
    }
    if (hasMultiValue) {
      // Lọc đa giá trị (nhiều thể loại/quốc gia) -> endpoint danh-sach tổng hợp
      const res = await getDanhSach("phim-moi", queryParams);
      return res?.data || null;
    }
    if (filters.theLoai) {
      const res = await getTheLoaiDetails(filters.theLoai, queryParams);
      return res?.data || null;
    }
    if (filters.quocGia) {
      const res = await getQuocGiaDetails(filters.quocGia, queryParams);
      return res?.data || null;
    }
    if (hasAnyFilter) {
      const res = await getDanhSach("phim-moi", queryParams);
      return res?.data || null;
    }
    const res = await getPhimMoi(page, 30);
    return res?.data || null;
  }, [filters]);

  const AND_TARGET_ITEMS = 24;
  const AND_MAX_SCAN_PAGES = 15;

  const fetchMovies = useCallback(async (page: number = 1, append: boolean = false) => {
    const fetchId = ++fetchIdRef.current;
    const requiredGenres = (filters.theLoai || "").split(",").filter(Boolean);
    const isAndMode = requiredGenres.length > 1;

    if (!isAndMode) {
      setLoading(true);
      try {
        const data = await fetchListPage(page);
        if (fetchId !== fetchIdRef.current) return;
        setMovies(data);
        updateTitle();
      } catch (e) {
        if (fetchId === fetchIdRef.current) {
          console.error("Error fetching movies:", e);
        }
      } finally {
        if (fetchId === fetchIdRef.current) {
          setLoading(false);
        }
      }
      return;
    }

    // AND mode: API chỉ hỗ trợ OR -> quét nhiều trang API để gom phim
    // có ĐỦ tất cả thể loại đã chọn. Kết quả tích lũy, phân trang bằng "Tải thêm".
    const sig = JSON.stringify(filters);
    // append=false (gọi từ effect/filter change) -> luôn reset về batch đầu.
    // append=true (nút "Tải thêm") -> tiếp tục từ cursor nếu filter không đổi.
    if (!append || andRef.current.sig !== sig) {
      andRef.current = { sig, cursor: 1, exhausted: false, busy: false, items: [] };
    }
    const state = andRef.current;
    if (state.busy) return;
    state.busy = true;
    const collected = [...state.items];
    const batch: Movie[] = [];
    let apiPage = state.cursor;
    let lastData: MovieListResponse | null = null;
    let lastTotalPages = 0;
    let scanned = 0;

    setLoading(true);
    try {
      while (scanned < AND_MAX_SCAN_PAGES && !state.exhausted) {
        const data = await fetchListPage(apiPage);
        if (fetchId !== fetchIdRef.current) return;
        if (!data) break; // lỗi mạng -> giữ cursor để thử lại sau
        lastData = data;
        const pag = data.params?.pagination;
        if (pag) lastTotalPages = Math.ceil(pag.totalItems / pag.totalItemsPerPage);
        const matches = (data.items || []).filter((m) => {
          const slugs = new Set((m.category || []).map((c) => c.slug));
          return requiredGenres.every((s) => slugs.has(s));
        });
        batch.push(...matches);
        collected.push(...matches);
        scanned++;
        apiPage++;
        if (lastTotalPages > 0 && apiPage > lastTotalPages) {
          state.exhausted = true;
          break;
        }
        if (batch.length >= AND_TARGET_ITEMS) break;
      }
      if (scanned === AND_MAX_SCAN_PAGES && !state.exhausted && lastTotalPages > 0 && apiPage <= lastTotalPages) {
        // vẫn còn trang để quét -> chưa hết
      }
      state.cursor = apiPage;
      state.items = collected;
      setAndExhausted(state.exhausted);
      setMovies(
        lastData
          ? { ...lastData, items: collected }
          : {
              items: collected,
              params: {
                pagination: {
                  totalItems: 0,
                  totalItemsPerPage: AND_TARGET_ITEMS,
                  currentPage: 1,
                  pageRanges: 0,
                },
              },
            }
      );
      updateTitle();
    } catch (e) {
      if (fetchId === fetchIdRef.current) {
        console.error("Error fetching movies:", e);
      }
    } finally {
      state.busy = false;
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [filters, fetchListPage, updateTitle]);

  const fetchFilterData = useCallback(async () => {
    try {
      const [theLoaiRes, quocGiaRes] = await Promise.all([getTheLoai(), getQuocGia()]);
      console.log("TheLoai response:", theLoaiRes);
      console.log("QuocGia response:", quocGiaRes);

      if (theLoaiRes?.data?.items) {
        const filtered = theLoaiRes.data.items.filter(item => !item.name.toLowerCase().includes('18+') && !item.name.toLowerCase().includes('18'));
        console.log("Filtered theLoai:", filtered);
        setTheLoaiList(filtered);
      } else {
        console.warn("No theLoai items found");
      }
      if (quocGiaRes?.data?.items) {
        console.log("QuocGia items:", quocGiaRes.data.items);
        setQuocGiaList(quocGiaRes.data.items);
      } else {
        console.warn("No quocGia items found");
      }
    } catch (e) {
      console.error("Error fetching filter data:", e);
    }
  }, []);

  useEffect(() => {
    const theLoai = searchParams.get("theLoai") || undefined;
    const quocGia = searchParams.get("quocGia") || undefined;
    const year = searchParams.get("year") || undefined;
    const loaiPhim = searchParams.get("loaiPhim") || undefined;
    const phienBan = searchParams.get("phienBan") || undefined;
    const danhSach = searchParams.get("danhSach") || undefined;
    const sortField = searchParams.get("sortField") || undefined;
    const sortType = searchParams.get("sortType") || undefined;
    setFilters({ theLoai, quocGia, year, loaiPhim, phienBan, danhSach, sortField, sortType });
  }, [
    searchParams.get("theLoai"),
    searchParams.get("quocGia"),
    searchParams.get("year"),
    searchParams.get("loaiPhim"),
    searchParams.get("phienBan"),
    searchParams.get("danhSach"),
    searchParams.get("sortField"),
    searchParams.get("sortType")
  ]);

  const handleFilterChange = (newFilters: { theLoai?: string; quocGia?: string; year?: string; loaiPhim?: string; phienBan?: string; danhSach?: string; sortField?: string; sortType?: string }) => {
    const params = new URLSearchParams();
    if (newFilters.theLoai) params.set("theLoai", newFilters.theLoai);
    if (newFilters.quocGia) params.set("quocGia", newFilters.quocGia);
    if (newFilters.year) params.set("year", newFilters.year);
    if (newFilters.loaiPhim) params.set("loaiPhim", newFilters.loaiPhim);
    if (newFilters.phienBan) params.set("phienBan", newFilters.phienBan);
    if (newFilters.danhSach) params.set("danhSach", newFilters.danhSach);
    if (newFilters.sortField) params.set("sortField", newFilters.sortField);
    if (newFilters.sortType) params.set("sortType", newFilters.sortType);

    setFilters(newFilters);
    const queryString = params.toString();
    router.push(queryString ? `/filter?${queryString}` : "/filter", { scroll: false });
    setCurrentPage(1);
  };

  useEffect(() => { fetchFilterData(); }, [fetchFilterData]);
  useEffect(() => {
    const p = searchParams.get('page');
    if (p) {
      setCurrentPage(parseInt(p, 10));
    } else {
      setCurrentPage(1);
    }
  }, [searchParams.get('page')]);
  useEffect(() => { fetchMovies(currentPage); }, [fetchMovies, currentPage]);

  const isAndMode = (filters.theLoai || "").split(",").filter(Boolean).length > 1;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={handleBack}
            className="md:hidden bg-zinc-900/80 hover:bg-zinc-800 text-white p-2 rounded-full transition-all border border-white/10 shrink-0"
            title="Quay lại"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl md:text-3xl font-bold text-white font-outfit drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
            {title}
          </h2>
        </div>
        {movies?.params?.pagination && (filters.theLoai || "").split(",").filter(Boolean).length <= 1 && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Tổng: {movies.params.pagination.totalItems} phim
          </span>
        )}
      </div>
      {isAndMode && (
        <p className="mb-4 text-xs text-amber-400/90">
          Đang lọc phim có đủ tất cả thể loại đã chọn — hệ thống đang quét dữ liệu, dùng nút &quot;Tải thêm&quot; để xem thêm kết quả.
        </p>
      )}
      <div className="mb-6">
        <FilterPanel
          theLoaiList={theLoaiList}
          quocGiaList={quocGiaList}
          initialFilters={{
            theLoaiSlug: filters.theLoai,
            quocGiaSlug: filters.quocGia,
            year: filters.year,
            loaiPhim: filters.loaiPhim,
            phienBan: filters.phienBan,
            danhSach: filters.danhSach,
            sortField: filters.sortField,
            sortType: filters.sortType
          }}
          onFilterChange={handleFilterChange}
        />
      </div>
      <div>
        {loading && !(movies?.items && movies.items.length > 0) ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
          </div>
        ) : movies?.items && movies.items.length > 0 ? (
          <>
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-start justify-center pt-24 bg-black/40 backdrop-blur-[1px] rounded-lg">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                    <span className="text-xs text-zinc-300">Đang lọc kết quả...</span>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {movies.items.map(movie => (
                  <MovieCard key={movie._id} movie={movie} />
                ))}
              </div>
            </div>
            {isAndMode ? (
              <div className="mt-8 flex flex-col items-center gap-2">
                {andExhausted ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Đã hiển thị tất cả {movies.items.length} phim phù hợp.
                  </p>
                ) : (
                  <button
                    onClick={() => fetchMovies(currentPage, true)}
                    disabled={loading}
                    className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    {loading && (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    Tải thêm kết quả
                  </button>
                )}
              </div>
            ) : (
              Math.ceil(movies.params.pagination.totalItems / movies.params.pagination.totalItemsPerPage) > 1 && (
                <div className="mt-8">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(movies.params.pagination.totalItems / movies.params.pagination.totalItemsPerPage)}
                    baseUrl="/filter"
                  />
                </div>
              )
            )}
          </>
        ) : (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>Không tìm thấy phim nào với bộ lọc đã chọn.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FilterPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    }>
      <FilterContent />
    </Suspense>
  );
}
