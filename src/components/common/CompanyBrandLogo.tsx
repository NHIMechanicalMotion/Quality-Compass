import React, { useState } from 'react';
import type { OperatingCompanyId } from '../../data/operatingCompanies';

interface CompanyBrandLogoProps {
  companyId: OperatingCompanyId;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const NhiLogo: React.FC<{ size: 'xs' | 'sm' | 'md' | 'lg'; showText: boolean; className?: string }> = ({
  size,
  showText,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const heightClass = size === 'xs' ? 'h-4' : size === 'sm' ? 'h-5' : size === 'lg' ? 'h-9' : 'h-7';

  if (!imgError) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className={`bg-white rounded px-1 py-0.5 inline-flex items-center justify-center border border-slate-700/40 shadow-sm ${heightClass}`}>
          <img
            src="/brands/nhi.png"
            alt="NHI"
            className={`${heightClass} w-auto object-contain max-w-[120px]`}
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="relative inline-flex items-center justify-center bg-[#70c128] px-2.5 py-1 rounded shadow-sm overflow-hidden border border-[#5ca320]">
        <span className="font-black italic font-sans text-black tracking-tighter text-sm sm:text-base leading-none select-none">
          NHI
        </span>
        <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-[#4e8e19] transform skew-x-[-20deg]" />
      </div>
      {showText && size !== 'sm' && (
        <span className="font-bold text-xs text-slate-200 font-mono hidden sm:inline">
          Mechanical Motion
        </span>
      )}
    </div>
  );
};

const TerreLogo: React.FC<{ size: 'xs' | 'sm' | 'md' | 'lg'; showText: boolean; className?: string }> = ({
  size,
  showText,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const heightClass = size === 'xs' ? 'h-3.5' : size === 'sm' ? 'h-5' : size === 'lg' ? 'h-8' : 'h-6 sm:h-7';

  if (!imgError) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className={`bg-white rounded px-1.5 py-0.5 inline-flex items-center justify-center border border-slate-700/40 shadow-sm ${heightClass}`}>
          <img
            src="/brands/terre.png"
            alt="TERRE Products"
            className={`${heightClass} w-auto object-contain max-w-[140px]`}
            onError={() => setImgError(true)}
          />
        </div>
        {showText && size === 'lg' && (
          <span className="text-[10px] font-mono tracking-wider text-slate-400 hidden sm:inline">
            POWER TRANSMISSION
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <div className="flex flex-col items-center justify-center">
        <svg width="22" height="18" viewBox="0 0 28 24" fill="none" className="shrink-0">
          <rect x="2" y="2" width="24" height="6" rx="1.5" fill="#788c74" />
          <rect x="5" y="10" width="8" height="12" rx="1" fill="#3a4537" />
          <rect x="15" y="10" width="8" height="12" rx="1" fill="#3a4537" />
        </svg>
      </div>
      {showText && size !== 'xs' && (
        <div className="flex flex-col">
          <span className="font-bold tracking-widest text-xs sm:text-sm font-sans text-slate-300 leading-none">
            TERRE
          </span>
          <span className="text-[9px] font-mono tracking-wider text-slate-400 leading-none mt-0.5">
            PRODUCTS
          </span>
        </div>
      )}
    </div>
  );
};

const MantisLogo: React.FC<{ size: 'xs' | 'sm' | 'md' | 'lg'; showText: boolean; className?: string }> = ({
  size,
  showText,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const heightClass = size === 'xs' ? 'h-5' : size === 'sm' ? 'h-6' : size === 'lg' ? 'h-11' : 'h-8 sm:h-9';

  if (!imgError) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className={`bg-white rounded px-1 py-0.5 inline-flex items-center justify-center border border-slate-700/40 shadow-sm ${heightClass}`}>
          <img
            src="/brands/mantis.png"
            alt="Mantis Conveyor Products"
            className={`${heightClass} w-auto object-contain max-w-[150px]`}
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="20" height="20" viewBox="0 0 32 32" fill="none" className="shrink-0">
        <path
          d="M16 3L28 11V21L16 29L4 21V11L16 3Z"
          fill="#1e293b"
          stroke="#70c128"
          strokeWidth="2.5"
        />
        <circle cx="11" cy="14" r="4.5" fill="#70c128" />
        <circle cx="21" cy="14" r="4.5" fill="#70c128" />
        <path d="M16 16V25" stroke="#70c128" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {showText && size !== 'xs' && (
        <div className="flex flex-col">
          <span className="font-black tracking-wider text-xs sm:text-sm font-sans text-slate-100 leading-none">
            MANTIS
          </span>
          <span className="text-[8px] font-mono tracking-wider text-slate-400 leading-none mt-0.5">
            CONVEYOR PRODUCTS
          </span>
        </div>
      )}
    </div>
  );
};

const MakersLogo: React.FC<{ size: 'xs' | 'sm' | 'md' | 'lg'; showText: boolean; className?: string }> = ({
  size,
  showText,
  className = '',
}) => {
  const [imgError, setImgError] = useState(false);
  const heightClass = size === 'xs' ? 'h-5' : size === 'sm' ? 'h-6' : size === 'lg' ? 'h-11' : 'h-8 sm:h-9';

  if (!imgError) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className={`bg-slate-950 rounded px-1 py-0.5 inline-flex items-center justify-center border border-orange-500/50 shadow-sm ${heightClass}`}>
          <img
            src="/brands/makers.png"
            alt="Makers Automation"
            className={`${heightClass} w-auto object-contain max-w-[140px]`}
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    );
  }

  // Official Orange Hexagon Vector Mark
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="22" height="22" viewBox="0 0 32 32" fill="none" className="shrink-0">
        <path
          d="M16 2L29 9.5V24.5L16 32L3 24.5V9.5L16 2Z"
          fill="#ea580c"
          stroke="#fb923c"
          strokeWidth="1.5"
        />
        <path
          d="M9 22V12L16 18L23 12V22"
          stroke="#ffffff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && size !== 'xs' && (
        <div className="flex flex-col">
          <span className="font-extrabold tracking-wide text-xs sm:text-sm font-sans text-[#ea580c] leading-none">
            MAKERS
          </span>
          <span className="text-[8px] font-mono tracking-widest text-[#f97316] leading-none mt-0.5">
            SUB-COMPANY OF NHIMM
          </span>
        </div>
      )}
    </div>
  );
};

export const CombineFamilyMiniLogo: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [imgError, setImgError] = useState(false);

  if (!imgError) {
    return (
      <div className={`bg-white rounded px-1.5 py-0.5 inline-flex items-center justify-center overflow-hidden max-w-[136px] shadow-sm ${className}`}>
        <img
          src="/brands/nhi-family-header.jpg"
          alt="NHI Mechanical Motion Family of Operating Companies"
          className="h-5 w-auto max-w-[130px] object-contain"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 font-mono text-[10px] font-extrabold text-white uppercase tracking-wider">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
      <span>NHIMM COMBINED</span>
    </div>
  );
};

export const CompanyBrandLogo: React.FC<CompanyBrandLogoProps> = ({
  companyId,
  size = 'md',
  showText = true,
  className = '',
}) => {
  if (companyId === 'NHI') {
    return <NhiLogo size={size} showText={showText} className={className} />;
  }

  if (companyId === 'TERRE') {
    return <TerreLogo size={size} showText={showText} className={className} />;
  }

  if (companyId === 'MANTIS') {
    return <MantisLogo size={size} showText={showText} className={className} />;
  }

  if (companyId === 'MAKERS') {
    return <MakersLogo size={size} showText={showText} className={className} />;
  }

  // ALL: Parent Enterprise (NHI Mechanical Motion LLC)
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className="bg-gradient-to-r from-blue-700 via-emerald-600 to-amber-600 p-0.5 rounded shadow-sm">
        <div className="bg-slate-950 px-2 py-0.5 rounded flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="font-extrabold text-xs text-white font-mono uppercase tracking-wider">
            NHIMM ROLLUP
          </span>
        </div>
      </div>
      {showText && (
        <span className="text-xs font-mono text-slate-300 font-bold hidden sm:inline">
          NHI Mechanical Motion LLC
        </span>
      )}
    </div>
  );
};

export const SharedFamilyHeaderBanner: React.FC<{ className?: string; showArtworkImage?: boolean }> = ({
  className = '',
  showArtworkImage = true,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`rounded-lg border border-slate-800 bg-slate-950/90 p-2 shadow-md ${className}`}>
      {showArtworkImage && !imgError ? (
        <div className="flex flex-col items-center">
          <img
            src="/brands/nhi-family-header.jpg"
            alt="NHI Mechanical Motion Family of Operating Companies: NHI, Terre Products, Mantis Conveyor Products, Makers Automation"
            className="w-full max-h-16 sm:max-h-20 object-contain rounded bg-white p-1"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 overflow-x-auto p-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold whitespace-nowrap hidden lg:block">
            NHI Mechanical Motion Family of Operating Companies:
          </div>
          <div className="flex items-center gap-6 sm:gap-8 mx-auto lg:mx-0">
            <CompanyBrandLogo companyId="NHI" size="md" />
            <div className="h-6 w-px bg-slate-800" />
            <CompanyBrandLogo companyId="TERRE" size="md" />
            <div className="h-6 w-px bg-slate-800" />
            <CompanyBrandLogo companyId="MANTIS" size="md" />
            <div className="h-6 w-px bg-slate-800" />
            <CompanyBrandLogo companyId="MAKERS" size="md" />
          </div>
        </div>
      )}
    </div>
  );
};
