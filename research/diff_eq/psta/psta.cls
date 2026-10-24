% Licensed with CC-BY-SA
% Designed by S. Znamenskij, znamensk@rustex.botik.ru, svz@latex.pereslavl.ru
% Thanks to Petr A. Pyatkov, bigbox89@mail.ru, for improving the abbrevition of author names in 08.2026
\NeedsTeXFormat{LaTeX2e}%
\ProvidesClass{psta}[2026/10/16 18:44:16 Document class for PSTA journal and other bilingual proceedings]
\makeatletter
%%% Dependence of language {{{1
\errorcontextlines\maxdimen
\def\tracethe#1{\wlog{\string#1=\the#1}}%
\gdef\@nameshow#1{}% Redefine it to switch logging
\gdef\@nameshow#1{\wlog{\expandafter\string\csname #1\endcsname =\expandafter\meaning\csname#1\endcsname }}% Redefine it to switch logging
%    \wlog{\e@a@Tc\string{#1}=\e@a@Tc\meaning{#1}.}}%
%% \e@a@ - expansion order altering
%% A - argument in braces
%% a - argument without braces
%% C - \cs from \csname cs\endcsname in braces
%% c - \cs from \csname cs\endcsname without braces
%% S - aSsignement token, show
%% T - other single token
%% X ending - expand after following
%% l - \languagePartRelated@@  prefixed
%% xC -  expanded value of C
%% xA -  expanded value of A
\newcommand{\e@a@ScC}[3]{\e@a@ScxA{#1}{#2}{\csname#3\endcsname}}%
\newcommand{\e@a@Scc}[3]{\e@a@Sca{#1}{#2\expandafter}{\csname#3\endcsname}}%
\newcommand{\e@a@SceA}[4]{\e@a@Tc{#1}{#2#3}#3{#4}\@nameshow{#2}}%
\newcommand{\e@a@Sca}[3]{\e@a@Tc{#1}{#2}#3\@nameshow{#2}}%
\newcommand{\e@a@SclC}[3]{\e@a@ScC{#1}{#2}{\languagePartRelated@@ #3}}%
\newcommand{\e@a@Sclc}[3]{\e@a@Scc{#1}{#2}{\languagePartRelated@@ #3}}%
\newcommand{\e@a@ScxA}[3]{\e@a@SceA{#1}{#2}\expandafter{#3}}%
\newcommand{\e@a@ScxxA}[3]{\e@a@SceA{#1}{#2}{\expandafter\expandafter\expandafter}{#3}}%
\newcommand{\e@a@SlcC}[3]{\e@a@ScC{#1}{\languagePartRelated@@ #2}{#3}}%
\newcommand{\e@a@SlcxA}[3]{\e@a@ScxA{#1}{\languagePartRelated@@ #2}{#3}}%
\newcommand{\e@a@SlcxxA}[3]{\e@a@ScxxA{#1}{\languagePartRelated@@ #2}{#3}}%
\newcommand{\e@a@SlcxC}[3]{\e@a@SlcxxA{#1}{#2}{\csname#3\endcsname}}%
\newcommand{\e@a@Tc}[2]{\expandafter#1\csname#2\endcsname}%
\newcommand{\e@a@Tlc}[2]{\e@a@Tc#1{\languagePartRelated@@ #2}}%
\newcommand{\glet@lclc}{\global\let@lclc}%
\newcommand{\glet@cc}{\global\let@cc}%
\newcommand{\g@addto@lcxA}{\e@a@SlcxA\g@addto@macro}%
\newcommand{\let@lc}[1]{\let@c{\languagePartRelated@@ #1}}%
\newcommand{\let@c}[2]{\e@a@Tc\let{#1}#2\@nameshow{#1}}%
\newcommand{\let@cc}[2]{\e@a@Scc\let{#1}{#2}}%
\newcommand{\let@lcc}[2]{\let@cc{\languagePartRelated@@ #1}{#2}}%
\newcommand{\let@clc}[2]{\let@cc{#1}{\languagePartRelated@@ #2}}%
\newcommand{\let@lclc}[2]{\let@clc{\languagePartRelated@@ #1}{#2}}%
\newcommand{\gdef@lclC}[2]{\gdef@lcC{#1}{\languagePartRelated@@ #2}}%
\newcommand{\gdef@cA}[2]{\e@a@Sca\gdef{#1}{{#2}}}%
\newcommand{\xdef@cA}[2]{\e@a@Sca\xdef{#1}{{#2}}}%
\newcommand{\gdef@lcA}[2]{\gdef@lca{#1}{{{#2}}}}%
\newcommand{\gdef@lca}[2]{\e@a@Sca\gdef{\languagePartRelated@@ #1}#2}%
\newcommand{\gdef@lcC}[2]{\e@a@SlcC\gdef{#1}{#2}}%
\newcommand{\gdef@cxA}[2]{\e@a@ScxA{\gdef}{#1}{#2}}%
\newcommand{\gdef@lcxA}[2]{\e@a@ScxA{\gdef}{\languagePartRelated@@ #1}{#2}}%
\newcommand{\gdef@cxxA}[2]{\e@a@ScxxA{\gdef}{#1}{#2}}%
\newcommand{\gdef@lcxxA}[2]{\e@a@ScxxA{\gdef}{\languagePartRelated@@ #1}{#2}}%

% Future package pstatools
\protected\def\psta@error{\PackageError{pstatools}}
\protected\def\psta@warning{\PackageWarning{pstatools}}
\protected\def\psta@info{\PackageInfo{pstatools}}

% Macro \@namedefault{<csname>}  performs \@namedef if CS is undefined
\newcommand*{\@namedefault}[2]{%
  \@ifundefined{#1}{\@namedef#1{#2}}{}}%
% Macro \@namelet{<csname>}  performs \lef to CS
\newcommand*{\@namelet}[1]{%
  \expandafter\let\csname#1\endcsname}%
\newcommand*{\@nameletFromName}[2]{%
  \expandafter\let\csname#1\expandafter\endcsname\csname#2\endcsname}%
\newcommand*{\@letFromName}[2]{%
  \expandafter\let\expandafter#1\csname#2\endcsname}%
% Macro \@namexdef{<csname>}  performs \xdef to CS
\newcommand*{\@namexdef}[1]{%
  \expandafter\xdef\csname#1\endcsname}%
% Macro \@nameedef{<csname>}  performs \edef to CS
\newcommand*{\@nameedef}[1]{%
  \expandafter\edef\csname#1\endcsname}%
% Macro \@nameletdefault{<csname>}  performs \@namelet if CS is undefined
\newcommand*{\@nameletdefault}[2]{%
  \@ifundefined{#1}{\@namelet#1{#2}}{}}%
% Macro \wlogToken {<cstoken>}  writes cs meaning to log file
\newcommand*{\wlogToken}[1]{%
  \wlog{\string#1=\meaning#1}}%
% Macro \@nameWlog {<csname>}  writes CS meaning to log file
\newcommand*{\@nameWlog}[1]{%
  \expandafter\wlogToken\csname#1\endcsname}%
\newcommand*{\@nameToCS}[2]{#1{\csname#2\endcsname}}%
\newcommand*{\@namesToCSCS}[3]{#1{\csname#2\expandafter\endcsname\csname#3\endcsname}}%
% Macro \@nameWlog {<csname>}  writes register meaning to log file
\newcommand{\wlogThe@}[1]{%
  \wlog{\string#1 ->\the#1}}%
% Macro \addTo@{<macro name>}{<tokens>} appends macro (no arguments) definition  with <tokens>
\newcommand*{\addTo@}[2]{%
  \expandafter\def\expandafter#1\expandafter{#1#2}}%
% Macro \@nameAddTo{<csname>}{<tokens>} appends macro (no arguments) definition  with <tokens>
\newcommand*{\@nameAddTo}[2]{%
  \expandafter\addTo@\csname#1\endcsname{#2}}%
% Macro \@namesJoin{{<result csname>}{<first csname>}{join}{<second csname>}
 \def\@namesJoin#1#2#3#4{%
   \expandafter\@namesJoin@\csname#2\expandafter\expandafter\expandafter\endcsname
    \expandafter\expandafter\expandafter{\csname#4\endcsname}{#1}{#3}}%
\def\@namesJoin@#1#2#3#4{% {<first token>}{<second content>}{<result csname>}{<join>}
  \expandafter\def\csname#3\expandafter\endcsname\expandafter{#1#4#2}}%
%\def\@nameAddTo@#1#2{\expandafter\addTo@\csname#1\expandafter\endcsname\expandafter{#2}}%
%
% Prefix modification tools:
%
\xdef\russian@lang{\string russian}%
\xdef\english@lang{\string english}%
\def\RussianEnglish{%
  \ifx\languagename\russian@lang \expandafter\@firstoftwo\else\expandafter\@secondoftwo\fi}%
\def\setRelated{%\tracingall
  \edef\@csPrefixes{\RussianEnglish{{russian-}{english-}}{{english-}{russian-}}{\@ifundefined{article@id}{}{\article@id-}}}%
  \expandafter\def@Related\@csPrefixes}%
\def\def@Related#1#2#3{%
%  \def\languagePartRelated@@{#1#2}%
%  \def\article@otherlanguage@prefix{#1#3}%
%  \def\@articleRelated##1##2{\expandafter##1\csname#1##2\endcsname}%
%  \def\@languagePartRelated##1##2{\expandafter##1\csname#1#2##2\endcsname}%
%  \def\@otherLanguagePartRelated##1##2{\expandafter##1\csname#1#3##2\endcsname}%
  \edef\articleRelated@##1##2{##1{#3##2}}%
  \edef\languagePartRelated@##1##2{##1{#1#3##2}}%
  \edef\languagePartRelated@@{#1#3}%
  \edef\otherLanguageRelated@##1##2{##1{#2#3##2}}%
  \edef\otherLanguageRelated@@{#2#3}}%
\def@Related{russian}{english}{}%
%
% Macro \languagePartRelated@Let@ {<csname>}{<csname>}
% locally apply \let with current context prefix
% for both arguments
%
\newcommand{\languagePartRelated@Let@}[2]{%
  \languagePartRelated@{\languagePartRelated@\@nameletFromName{#1}}{#2}}%
%
%\def\eeafter{\expandafter\expandafter\expandafter}
%\def\eeAfter#1{\expandafter\expandafter\expandafter#1\expandafter\expandafter\expandafter}%
%
\catcode`\$=4 % 3->4 dollar sign was math shift
\catcode`\&=3 % 4->3 ampersand was alignment tab
%
% Macro \TrimStartingSpace {<code>}{<tokens>}
% Removes the starting space in {<tokens>}
% (if presents) in 2 expansions
% the <code> remains unexpanded, out of braces
%
\long\def\TrimStartingSpace#1#2{%
  \trim@start@space{#1}$#2$ #2$&}%
\long\def \trim@start@space#1#2$ #3$#4&{#1{#3}}%
%
% Macro \TrimFinalSpace {<code>}{<tokens>}
% Removes the final space in {<tokens>}
% (if presents) in 3 expansions
% the <code> remains unexpanded, out of braces
%
\long\def\TrimFinalSpace#1#2{%
  \trim@final@space@{#1}#2$ $&}%
\long\def\trim@final@space@#1#2 ${\trim@final@space@@{#1}#2$}%
\long\def\trim@final@space@@#1#2$#3$&{#1{#2}}%
%
\catcode`\$=3 % dollar sign is math shift
\catcode`\&=4 % ampersand is alignment tab
%
% Enumerated Lists of unique texts (=balanced token lists) (ELU):
% \appendIfNotIn{<prefix>}{<tokens>}
%  sets position <N> of #1 and provides:
%  \<prefix><N> = #2,
%  \@nameuse{#1=\detokenize{#2}} = <N>
%  \<prefix>.length = total number of entries in the list
\newcommand{\appendIfNotIn}[2]{%\tracingall
  \@ifundefined{#1.length}{%
    \@namedef{#1.length}{0}}{}%
  \edef\reserved@a{\detokenize{#2}}%
  \@ifundefined{#1=\reserved@a}%
    {\expandafter\count@\csname #1.length\endcsname
      \advance \count@\@ne
      \@nameedef{#1=\reserved@a}{\number\count@}%
      \@namedef{#1\number\count@}{#2}}%
    {\count@\@nameuse{#1=\reserved@a}}%
  \@nameedef{#1.current}{\number\count@}%\tracingnone
  \@nameedef{#1.length}{\number\count@}%\tracingnone
}%
\newcommand*{\forEachEntryIn}[2]{%
    \@ifundefined{#1.length}%
    {\count@ \@ne \forEachEntryIn@{#1}{#2}}}%
\def\forEachEntryIn@#1#2{%
  \ifnum\count@ > \@nameuse{#1.length}\else
  \articleRelated@\defRelated{#1}{\the\count@}
   #2\advance\count@ \@ne
  \expandafter\forEachEntryIn@\fi}%
\def\defRelated#1#2{%
%  \edef\authorRelated@##1##2{##1{#1#2##2}}%
  \edef\languageAuthorRelated@##1##2{##1{#1\RussianEnglish{RE}{ER}#2##2}}%
  \edef\otherLanguageAuthorRelated@##1##2{##1{#1\RussianEnglish{ER}{RE}#2##2}}}%




%%% Declare documentclass options {{{1
%
\def\english@encoding{T1}%
\def\russian@encoding{T2A}%
\@ifundefined{pstarussianpartonly}{\let\article@lang\english@lang}{\let\article@lang\russian@lang}%
\def\set@russian{\let\languagename\russian@lang}\set@russian
\def\set@english{\let\languagename\english@lang}%
\def\g@set@fontenc{\global\expandafter\fontencoding\expandafter
  {\csname\languagename @encoding\endcsname}\global\let\encodingdefault\f@encoding}%
\def\g@set@hyphenation{\language\csname l@\languagename\endcsname\relax}%\selectfont
\def\Russian{\set@russian\g@set@hyphenation\g@set@fontenc}%
\def\English{\set@english\g@set@hyphenation\g@set@fontenc}%

\let\latexmarkboth\markboth
\def\pdflang{en}
\def\DeclareLanguageEncoding#1#2#3#4{%
  \expandafter\def\csname#1NativeEncoding\endcsname{#2}%
  \@namedef{ParIn#1}{#2\ParInLanguage{#1}}%
  \DeclareOption{#1}{%
    \AtBeginDocument{\main@language{#1}%
    \def\pdflang{#3}#2%
    \edef\article@lang{\string #1}\PassOptionsToPackage{babel}{#1}}#4%
  }}%
\DeclareLanguageEncoding{russian}{}{ru}{}%
\DeclareLanguageEncoding{ukrainian}{}{ua}{}%
\DeclareLanguageEncoding{english}{}{en}{}%
\DeclareLanguageEncoding{francais}{}{fr}{}%
%
% Add extra language or encoding declarations if needed, please, with the appropriate co mment!
%
\def\ArticleEncoding{utf8}%
\def\DeclareInputEncoding#1{%
  \DeclareOption{#1}{\def\ArticleEncoding{#1}\PassOptionsToPackage{inputenc}{#1}}}%
\DeclareInputEncoding{cp1251}%
\DeclareInputEncoding{utf8}\def\utfVIIIname{utf8}%
\DeclareInputEncoding{koi8-r}%
%%% Declare other options and process {{{1
\def\underliedclass{amsproc}%
  \DeclareOption{book}{\def\underliedclass{amsbook}}%
  \DeclareOption{article}{\def\underliedclass{amsart}}%
%
\ifx\pdfoutput\undefined\let\pdfoutput\z@\fi \expandafter \PassOptionsToPackage
  \ifcase\pdfoutput {dvips,hiresbb}{graphics}\else{pdftex}{graphics,lscape}\fi
%
\DeclareOption{blind}{\xdef\psta@blind{y}}\let\HideFromPeer\HideFromPeer@\@ifundefined{psta@blind}{\def\psta@blind{n}}{}%
\DeclareOption{cp1251}{\PassOptionsToPackage{inputenc}{cp1251}\def\cyrillicencoding{cp1251}\def\Year{\the\year}}%
\DeclareOption{hyphenbreaks}{\def\hyphenbreaks{y}}\def\hyphenbreaks{n}%
\DeclareOption{fancyverts}{\def\load@fancyvrb{y}}\def\load@fancyvrb{n}%
\def\SoftSpaces{\spaceskip2.5ptplus3.5ptminus1.5pt}%
\def\NormalSpaces{\spaceskip\z@}%
%\DeclareOption{a4paper}{\def\@aIVpaper{y}}\def\@aIVpaper{n}%
\DeclareOption{secsymbol}{\UseSectionSymbol}%
%
\def\UseSectionSymbol{\font\SecSignFont=ts1-lmr10 \font\SecSignBoldFont=ts1-lmbx10
  \def\SecChar{{\protect\SecSignFont\char"A7}}\def\SeCChar{{\protect\SecSignBoldFont\char"A7}}%
  \def\sectionmark{\pagebreak[2]\@secmark\pstamarkright\sectionrunhead{\SeCChar\sectionname}}%
  \def\tocsection##1##2##3{\everypar {\SeCChar}\bigskip \noindent \parfillskip \z@
  \leftskip .2\hsize plus.2 \hsize minus .2\hsize
  \rightskip \leftskip \textsf {##1}\par{\@ifempty{##2}{}{\textbf {\SeCChar##2. }} }{##3}}%
  \renewcommand*{\p@section}{\SecChar}%
  \def\@seccntformat##1{\ifnum \c@section@level=1 \SeCChar\fi\csname the##1\endcsname.\hspace*{0.5em}}}%
%
\@ifundefined{pagerange}{\PassOptionsToPackage{colorlinks,pdfa,hyperfigures,citecolor=citecolor,urlcolor=urlcolor,linkcolor=linkcolor,bookmarksdepth=2}{hyperref}}%
{\PassOptionsToPackage{colorlinks,pdfa,bookmarksopen,hyperfigures,citecolor=citecolor,urlcolor=urlcolor,linkcolor=linkcolor,bookmarksdepth=2}{hyperref}}%
%
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{\underliedclass}}%
\ProcessOptions
%%% Load packages
\LoadClass{\underliedclass}%
%\RequirePackage{uniquecounter}%
\InputIfFileExists{data/otherlanguagepages}{}{}%
\InputIfFileExists{data/main.pages}{%
  \def\switch@language@icon{\ifx\article@lang\russian@lang
  %\wlog{Russian}%
    \switch@language@icon@\russian@lang\english@lang\else
  %\wlog{English}%
    \switch@language@icon@\english@lang\russian@lang\fi}%
  }{\let\switch@language@icon\relax}%
\IfFileExists{ifxetex.sty}{\RequirePackage{ifxetex}}{}%
\IfFileExists{iftex.sty}{\RequirePackage{iftex}}{}%
\ifxetex
\else
 \InputIfFileExists{glyphtounicode}{%
 \InputIfFileExists{glyphtounicode-cmr}{}{}%
 \InputIfFileExists{glyphtounicode-ntx}{}{}%
 \pdfgentounicode=1}{\RequirePackage{cmap}}%
\fi
\PassOptionsToPackage{amsmath}{intlimits,sumlimits,namelimits,centertags}%
\let\equation\gather
\let\endequation\endgather
\IfFileExists{url.sty}{\RequirePackage[hyphens]{url}}{}%
\RequirePackage{amsmath,amssymb,amscd,euscript}%
\RequirePackage[pdflang=\pdflang, backref,unicode]{hyperref}%
\RequirePackage{textcase}
\IfFileExists{mathtext.sty}{\RequirePackage[warn]{mathtext}}{}%
\RequirePackage[T1,T2A]{fontenc}%
\def \LinkToHomepage{\PSTAprepared\ \today\ \PSTAfor\startquote\JournalLink\stopquote}%
\RequirePackage{geometry}%
\IfFileExists{floatrow.sty}{\RequirePackage{floatrow}%
  \floatsetup[figure]{captionskip=\smallskipamount}%
  \floatsetup[table]{captionskip=\smallskipamount,capposition=top}}{}%

%%% Load psta packages
\def\publname{\TopHead}%
\@ifundefined{journalabbreviationinenglish}{\def\journalabbreviationinenglish{psta}}{}%
\def\PublicationInfo{{}\PSTAprepared{ }\PSTAfor \emph{\JournalLink} \PSTAat \two@digits{\the\day}.\two@digits{\the\month}.\two@digits{\the\year} }%
\def\PublicationLink#1{}%
\def\orgdef#1\\ #2\\ #3\\ #4\\ #5\\ {%
  \expandafter\def\csname english-*#1\endcsname{#3}%
  \expandafter\def\csname russian-*#1\endcsname{#5}%
  \expandafter\orgdef@\csname#1\expandafter\endcsname
    \csname english-#1\expandafter\endcsname
    \csname russian-#1\endcsname{#2}{#3}{#4}{#5}{#1}}%
\def\orgdef@#1#2#3#4#5#6#7#8{%
  \def#1{\csname\languagename-#8\endcsname}%
  \def#2{\href{#4}{#5}}%
  \def#3{\href{#6}{#7}}}%

\def\ForCommaSpaceSeparatedListUntillPoint#1#2.{\ProceedNextUntillComma{#1}#2, ,}%
\def\ProceedNextUntillComma#1#2, #3{#1#2\ifx,#3\@firstoffour\fi\ProceedNextUntillComma{#1}#3}%
\def\@firstoffour#1#2#3#4{#1}%
\def\CanDependOnLanguage#1#2{\def#2{\expandafter
    \ifx\csname#1-\expandafter\@gobble\string#2\expandafter\endcsname\relax
        \csname default-\expandafter\@gobble\string#2\expandafter\endcsname
    \else\csname#1-\expandafter\@gobble\string#2\expandafter\endcsname\fi}}%
\def\CanDependOnLanguagename{\CanDependOnLanguage\languagename}%
\def\CanDependOnBibLanguage{\CanDependOnLanguage\BibLanguage}%
\def\AtLanguageDefine#1#2#3{\expandafter\def\csname #1-\expandafter\@gobble\string#2\endcsname{#3}}%
\def\DefineDefaultRussian#1#2#3{\CanDependOnLanguage\languagename{#1}%
  \AtLanguageDefine{default}{#1}{#2}\AtLanguageDefine{russian}{#1}{#3}}%
%
\RequirePackage{inputenc}%
\expandafter\RequirePackage[russian,english]{babel}%
\def\switch@language{\RussianEnglish{\letlanguagename\english@lang}{\letlanguagename\russian@lang}\selectlanguage{\languagename}}%

\def\set@headline@encoding#1{\global\expandafter
    \let\expandafter\headline@language\csname #1@lang\endcsname\expandafter
    \def\expandafter\patchpdfheadlineencoding\expandafter{\expandafter\let\expandafter
    \encodingdefault\csname#1@encoding\endcsname}}%
\def\ParInLanguage#1{\g@set@language{#1}\edef\languagename{\expandafter\string #1}}%
%\foreign@language{russian}%\wlog{\string\languagename=\languagename}%
\@ifundefined{ArticleEncoding}{\def\ArticleEncoding{utf8}\PassOptionsToPackage{inputenc}{utf8}}{}
\inputencoding{\ArticleEncoding}%
\catcode 64=11
\set@headline@encoding{\article@lang}%
\edef\@tempa{\journalabbreviationinenglish-\ArticleEncoding.sty}%
\def\DoiAndLink{}%
\RequirePackage[rgb,hyperref]{xcolor}%
\def\@@mod{rgb}\selectcolormodel{rgb}%
\convertcolorsUtrue\convertcolorsDtrue
\begingroup
    \pdfcompresslevel=0
  \IfFileExists{data/\jobname.xmp}{%
    \immediate\pdfobj stream attr {%
      /Type /Metadata
      /Subtype /XML
    } file{data/\jobname.xmp}%
    \pdfcatalog {/Metadata \the\pdflastobj\space 0 R}%
    \pdfcompresslevel=0
     \def\pdfx@numcoords{/N 3 /Alternate/DeviceRGB}%
      \immediate\pdfobj stream attr{\pdfx@numcoords} file{psta/sRGBIEC1966-2.1.icm}%
    \edef\pdfx@outintent@dict{%
      /Type /OutputIntent /S/GTS_PDFA1 /OutputConditionIdentifier (IEC sRGB)/DestOutputProfile 1 0 R/Info(IEC 61966-2.1 Default RGB colour space - sRGB)
      /RegistryName(http://www.iec.ch) }%
    }{}%
    {}%
\endgroup
\catcode`\%=11
\IfFileExists{data/\jobname.pdfinfo}{\newread \read@info@
    \openin \read@info@ = data/\jobname.pdfinfo
    \ifeof  \read@info@ \errmessage{unreadable data/\jobname.pdfinfo!} \else
    \read \read@info@ to\pdf@info@@@
\begingroup
    \edef\0{\string\0}\edef\1{\string\1}\edef\2{\string\2}\edef\3{\string\3}\edef\({\string\(}\edef\){\string\)}\xdef\pdf@info@@{\pdf@info@@@}\endgroup
  \closein\read@info@\fi
\AtBeginDocument{\edef\0{\string\\0}\def\PDF@FinishDoc{\begingroup
   \pdfinfo{\pdf@info@@}\endgroup}}}{}{}\catcode`\%=14
\InputIfFileExists{psta/\journalabbreviationinenglish-\ArticleEncoding.sty}{}{%
  \wlog{No psta/\journalabbreviationinenglish-\ArticleEncoding.sty!}%
   \orgdef JournalLink\\ https://psta.psiras.ru/index_en.htm\\ Program Systems: Theory and Applications\\
https://psta.psiras.ru\\ Program Systems: Theory and Applications\\
\def\PSTASubmitted{Submitted to}%
\def\PSTAat{at }%
\def\PSTAfor{for the journal }%
\def\PSTAacknowledgments{Acknowledgments}%
\def\PSTAprepared{Prepared }%
\def\PSTAsubmitting{(submitting)}%
\def\PSTAsubmit{To the journal }%
\def\SSylkaa{Sample citation of this publication:}%
\def\UDCname{UDC}%
\def\GRNTIname{CSCSTI}%
\def\bibIssuetext{No.}%
\def\bibVoltext{Vol.}%
\def\bibissuetext{no.~}%
\def\bibpagestext{pp.}%
\def\bibpaperidtext{id}%
\def\bibpagetext{p.}%
\def\Figurename{Figure}%
\def\fnum@figure{Figure \thefigure}%
\def\inrussianname{In Russian}%
\def\keywordsname{Key words and phrases}%
\def\manyauthors{About the authors}%
\def\oneauthor{About the author}%
\def\startquote{``}%
\def\stopquote{''}%
\def\PSTArubric{%
         principles and technologies of electronic publications\or
         information systems in culture and education\or
         information technology in medicine\or
         information systems in economics\or
         artificial intelligence, intelligent systems, neural networks\or
         theoretical computer science\or
         computational science\or
         optimization Methods and Control Theory\or
         hardware and software for supercomputers\or
         hardware, software and distributed supercomputer systems\or
         necrologs\or
         contents\or
         author index\or
         contents (in Russian)\or
         author index (in Russian)}%
\def\PSTACRediT{conceptualization\or methodology\or software\or validation\or formal analysis\or investigation\or resources\or data curation\or writing (original draft)\or writing (review \& editing)\or visualization\or supervision\or project administration\or funding acquisition}%
\def\TopHead{{\large\textcolor{red}{!!!\hss ---\hss---}\hss Missing \textcolor{red}{psta} subdirectory from
  \href{https://psta.psiras.ru/publ-conditions/psta.zip}{\textcolor{red}{\textbf{psta.zip}}},
   \textcolor{red}{\hss ---\hss---\hss!!!}}}}%
\def\commaSpace{, }%
\def\brel#1{\discretionary{\hbox{\mathsurround=0pt$\mskip\thickmuskip#1$}}{}{}#1\nobreak}
\def\bbin#1{\discretionary{\hbox{\mathsurround=0pt$\mskip\medmuskip#1$}}{}{}#1\nobreak}
\@ifundefined{Urlmuskip}{}{\Urlmuskip=0mu plus 2mu }%

\definecolor{darkred}{rgb}{0.3,0,0}%
\definecolor{lightgray}{rgb}{0.6,0.6,0.6}%
\definecolor{gray}{rgb}{0.45,0.45,0.45}%
\definecolor{citecolor}{rgb}{0,0.3,0.25}%
\definecolor{urlcolor}{rgb}{0.25,0,0.1}%
\definecolor{linkcolor}{rgb}{0,0.1,0.40}%
\definecolor{backrefcolor}{rgb}{0.55,0.55,0.55}%
\definecolor{verbatimrules}{rgb}{0.1,0.3,.2}%
\expandafter\let\expandafter\@indexbordercolor\csname\string\color@verbatimrules\endcsname
\definecolor{verbatimbgu}{rgb}{.85,0.97,.9}%
\definecolor{verbatimbg}{rgb}{.92,1,.92}%
\definecolor{verbatimtitle}{rgb}{0.1,0.4,0.2}%
\definecolor{verbatimnumbers}{rgb}{0.7,0.8,0.8}%
\definecolor{verbatimdefault}{rgb}{0.25,0.2,0.3}%
\definecolor{authorsmarks}{rgb}{0.1,0.3,0.3}%
\definecolor{string}{rgb}{0.45,0.45,0.1}%
\definecolor{gt}{rgb}{0.55,0.75,0.45}%
\definecolor{word}{rgb}{0.25,0.25,0.25}%
\definecolor{key}{rgb}{0.1,0.4,0.1}%
\definecolor{variable}{rgb}{0.4,0,0}%
\definecolor{comment}{rgb}{0.15,0.2,0.6}%
\definecolor{parameter}{rgb}{0,0.2,0.5}%
%
%
%\RequirePackage{bookmark}
%\RequirePackage[figure,table]{totalcount}%
\AtBeginDocument{\let\cites\cite}%

%%
\long\def\NothebibliographyinEnglish#1\end{\end}%
%
\def\HideFromPeer#1{\textcolor{authorsmarks}{$\langle$#1$\rangle$}}%
\let\HideFromPeer\@firstofone
\def\@Reviewer{\par\hugeskip \PSTAAssigned\par\bigskip \AnonimousReview}%
\newskip\psta@v@pt
\newskip\bigsoftskipamount
\newskip\hugerskipamount
\newskip\hugeskipamount\def\hugeskip{\@@par\penalty-100\vskip\hugeskipamount}%
\newskip\smallerskipamount\def\smallerskip{\@@par\penalty200\vskip\smallerskipamount}%
\newskip\biggerskipamount\def\biggerskip{\@@par\penalty100\vskip\biggerskipamount}%
\def\set@fontsize#1#2#3{%
    \@defaultunits\@tempdimb#2pt\relax\@nnil
    \edef\f@size{\strip@pt\@tempdimb}%
    \@defaultunits\@tempskipa#3pt\relax\@nnil
    \edef\f@baselineskip{\the\@tempskipa}%
    \edef\f@linespread{#1}%
    \let\baselinestretch\f@linespread
    \normalbaselineskip\f@baselineskip\relax
    \normalbaselineskip\f@linespread\normalbaselineskip
    \let\size@update\psta@ajust@vskips}%
\def\psta@set@vskips{%
  \@tempdima\psta@v@tolerance\psta@v@pt
  \@tempdimb\psta@v@tolerance\@tempdima
  \@tempdimb 2\@tempdimb
  \advance\@tempdimb \@tempdima
  \psta@setskip \parskip {2}%
  \psta@setskip \smallskipamount 3%
  \psta@setskip \smallerskipamount{4.5}%
  \psta@setskip \medskipamount 6%
  \psta@setskip \biggerskipamount 9%
  \psta@setskip \bigskipamount {12}%
  \psta@setsoftskip \bigsoftskipamount {12}%
  \psta@setskip \hugerskipamount{18}%
  \psta@setskip \hugeskipamount{24}%
  \belowdisplayskip=\smallskipamount
  \belowdisplayshortskip=\smallskipamount
  \abovedisplayshortskip=\parskip
  \abovedisplayskip=\smallskipamount
  \baselineskip=\smallskipamount %\tracing 0
  \advance\baselineskip .75\normalbaselineskip
   \setbox\strutbox\hbox{%
        \vrule\@height7\psta@v@pt
              \@depth3\psta@v@pt
              \@width\z@}%
      \let\size@update\relax%
  \floatsep \medskipamount %(default 12pt plus 2pt minus 2pt) the separation between floats in top or bottom areas
  \dblfloatsep \medskipamount %(default 12pt plus 2pt minus 2pt) the separation between double-column floats on two column pages
  \textfloatsep \biggerskipamount %(default 20pt plus 2pt minus 4pt) the separation between top or bottom area and the text area
  \dbltextfloatsep \biggerskipamount %(default 20pt plus 2pt minus 4pt) the analog of \textfloatsep for two-column floats
  \intextsep \medskipamount%(default 12pt plus 2pt minus 2pt) the separation of float to the surrounding text is controlled by
  \jot=\smallskipamount  \belowdisplayskip=\abovedisplayskip}%
\def\vTolerance#1 {\def\psta@v@tolerance{#1}}\vTolerance 0.1
\def\psta@setskip#1#2{#1=#2\psta@v@pt plus#2\@tempdima minus #2\@tempdimb\relax}%
\def\psta@setsoftskip#1#2{#1=#2\psta@v@pt plus\dimexpr#2\@tempdima*2\relax minus #2\@tempdimb\relax}%
\def\psta@v@tighter{\@@par \psta@v@pt 0.75\psta@v@pt \psta@set@vskips}%
\let\vTighter\psta@v@tighter
\def\psta@v@taller{\@@par \psta@v@pt 1.333\psta@v@pt \psta@set@vskips}%
\def\psta@ajust@vskips{%
  \psta@v@pt\psta@vscale\normalbaselineskip
  \if y\psta@use@vscale\else\advance\psta@v@pt\normalbaselineskip
  \fi
  \divide \psta@v@pt 12
  \psta@set@vskips}%
\def\vExpand#1 {\let\psta@use@vscale n\def\psta@vscale{#1}\csname psta@ajust@vskips\endcsname }\vExpand 0 %
\def\vScale#1 {\let\psta@use@vscale y\def\psta@vscale{#1}\csname psta@ajust@vskips\endcsname }%
\AtBeginDocument{\psta@ajust@vskips}%

%%%%%%%%%%%%                  EnumItem                             %%%%%%%%%%%%%%
\RequirePackage{enumitem}%
\setlist[enumerate]{labelindent=0cm, labelwidth=.5\parindent, itemindent=0\parindent,leftmargin=\parindent,rightmargin=.333\parindent,
  topsep=1.5\parskip,parsep=.5\parskip,itemsep=.5\parskip,before={\psta@v@tighter},after={\@@par\psta@v@taller},first={\parindent=.666\parindent},
  ref={{\upshape\footnotesize \textsf{(\emph{\theenumi})\!}}}}%
\setlist[description]{labelindent=.25\parindent, labelwidth=1\parindent, leftmargin=1\parindent,rightmargin=.333\parindent,style=unboxed%
  ,topsep=1.5\parskip,parsep=.5\parskip,itemsep=.5\parskip,before={\psta@v@tighter},after={\@@par\psta@v@taller},first={\parindent=.666\parindent}}%
\setlist[itemize]{labelindent=0pt, labelwidth=0pt, itemindent=0pt,leftmargin=1\parindent,rightmargin=.333\parindent,label=\copy\pstabulletbox
  ,topsep=1.5\parskip,parsep=.5\parskip,itemsep=.5\parskip,before={\psta@v@tighter},after={\@@par\psta@v@taller},first={\parindent=.666\parindent}}%
\newbox\pstabulletbox
\AtBeginDocument{\setbox\pstabulletbox\hbox{$\vcenter{\hbox{\scalebox{.9}[0.6]{\hbox{$\bullet$}}}}$}}%
\renewcommand{\descriptionlabel}[1]{\hspace\labelsep{\scalebox{1.05}{\emph{#1}}}}%
\def\FV@Space{\kern.5em}%
\def\pstarus#1#2{\russian@alph{\csname c@#2\endcsname}}%
\def\pstaRus#1#2{\russian@Alph{\csname c@#2\endcsname}}%
\def\pstarualph#1{{\footnotesize\textsf(}#1\textit{\pstarus\alph*}{\footnotesize\textsf)}}%
\def\pstarualphei#1{{\footnotesize\textsf(}\textit{#1\pstarus\alph*}{\footnotesize\textsf)}}%
\def\pstaruAlph#1{{\scriptsize\textsf(#1\pstaRus\expandafter\alph*\scriptsize\textsf)}}%
\@ifundefined{SetEnumitemKey}{}{%
  \SetEnumitemKey{parindent}{labelwidth=\parindent, itemindent=0pt,leftmargin=\parindent,rightmargin=0pt}  }%
\SetEnumitemKey{--}{label=--,leftmargin=1.3em,itemindent=0em,rightmargin=0.5em}%
\SetEnumitemKey{1.1}{label*=\arabic*.}%
\let\graybf\relax
\SetEnumitemKey{1.}{label*=\noexpand\graybfbox{0.9}{\itshape\arabic*}.}%
\SetEnumitemKey{1}{label*=\noexpand\graybfbox{0.9}{\upshape\arabic*}}%
\SetEnumitemKey{a}{label*=\graybf{\noexpand\pstaru\alph*}}%
\SetEnumitemKey{1)}{leftmargin=0em,itemindent=2.8em,rightmargin=0em,label={\footnotesize\textup{\arabic*}\kern-.5pt\scriptsize${\string)}$},
    ref={\footnotesize\textup{\arabic*}\kern-.5pt\scriptsize${\string)}$}}%
\SetEnumitemKey{123}{label={\textup{\textsf\scriptsize(\!\footnotesize\textit{\arabic*}\kern-.5pt\scriptsize\textsf)}},
    ref={\textup{\footnotesize\textsf(\emph{\arabic*}\textsf)}}}%
\SetEnumitemKey{iii}{label={\hbox to2em{\hss\refInParens{\roman*}\hss\!}},ref={\refInParens{\roman*}},labelwidth=1.3em, itemindent=.5 em, labelsep=0em, leftmargin=1em,style=standard}%
%\SetEnumitemKey{iii}{label={\refInParens{\roman*}},ref={\refInParens{\roman*}},labelwidth=1.3em, itemindent=.5 em, labelsep=.3em, leftmargin=1em}%
\SetEnumitemKey{abc}{label={\footnotesize\textsf(}\emph{\alph*}{\footnotesize\textsf)},
    ref={\footnotesize\textsf(}\emph{\alph*}{\footnotesize\textsf)}}%
\SetEnumitemKey{ABC}{label={\scriptsize\textsf(\emph{\Alph*}\textsf)},
    ref={\footnotesize\textsf(\emph{\Alph*}\textsf)}}%
\SetEnumitemKey{ABVGD}{label={\pstaruAlph{\noexpand}},ref={\pstaruAlph{\noexpand}}}%
\SetEnumitemKey{abvgd}{label={\refInParens{\emph{\noexpand \pstarus\alph*}}},ref=\refInParens{\emph{\noexpand\pstarus\alph*}}}%
%\SetEnumitemKey{abvgd}{label={\pstarualphei{\noexpand}},ref={\pstarualphei{\noexpand}}}%
\SetEnumitemKey{inner}{labelindent=0\parindent, labelwidth=0\parindent, leftmargin=0\parindent,rightmargin=.333\parindent}%
\SetEnumitemKey{inner-desc}{labelindent=-.25\parindent, leftmargin=0.5\parindent,rightmargin=.333\parindent}%
\def\graybfbox#1#2{\scalebox{#1}{\hbox{\textcolor[rgb]{0.13,0.13,0}{\textbf{#2}}}}}
\def\graybf#1{\textcolor[rgb]{0.13,0.13,0}{{\protect\smallerfont\textbf{#1}}}}
\def\smallerfont{\edef\f@size{\ifcase\f@size 0\or0\or1\or2\or3\or4\or5\or6\or7\or7\or8\or9\else\f@size\fi}}
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%                                    %%%%%%%%%%%%%                  Upright Braces                       %%%%%%%%%%%%%%
\edef\pstastringOpen{\string(}%
\edef\pstastringClose{\string)}%
\def\pstastringOpenUp{\relax \ifmmode \pstastringOpen\else\textup\pstastringOpen\fi}%
\def\pstastringCloseUp{\relax \ifmmode \pstastringClose\else\textup\pstastringClose\fi}%
\catcode`(=13 \catcode`)=13
\def\UprightTextParens{\catcode`(=13 \catcode`)=13 \let(\pstastringOpenUp \let)\pstastringCloseUp}%
\def\NoUprightTextParens{\catcode`(=12 \catcode`)=12}\NoUprightTextParens
%
\newcommand\WerbatimToken[1]{\edef#1{\string#1}}%
\WerbatimToken\EndWeed
\WerbatimToken\Bound
\WerbatimToken\Weed@Cursor
\WerbatimToken\Weed@@Cursor
\gdef\@secondfirstoftwo#1#2{#2#1}%
%
\let\equation\gather \let\endequation\endgather
\RequirePackage{nameref,color,graphics,pdflscape,upref,rotating}%
\RequirePackage{array}\setlength{\extrarowheight}{2pt}%
\RequirePackage{dcolumn}%
\newcolumntype{C}[1]{>{ \centering\baselineskip9pt\hskip\z@\arraybackslash}m{#1}<{\nobreak\hskip 0pt\vphantom{$a_{\int}$}}}
\newcolumntype{L}[1]{>{\raggedright\baselineskip9pt\hskip\z@ \arraybackslash}m{#1}<{\nobreak\hskip 0pt\vphantom{$a_{\int}$}}}
\newcolumntype{P}[1]{>{\baselineskip9pt\hskip\z@\arraybackslash}m{#1}<{\nobreak\hskip 0pt\vphantom{$a_{\int}$}}}
\newcolumntype{,}{D{,}{,}{-1}}
\newcolumntype{.}{D{.}{.}{-1}}
\RequirePackage{colortbl}
\newcommand\thinhline{\arrayrulecolor{lightgray}\hline\arrayrulecolor{black}}
\newcommand\thinvline{\textcolor{lightgray}{\vrule width .2pt}}
\newcommand\thincline[1]{\arrayrulecolor{lightgray}\cline{#1}\arrayrulecolor{black}}
\newcommand\thinmidrule{\attayrulecolor{lightgray}\midrule\arrayrulecolor{black}}
%%%%%%%%%%%%%%%  General Cyrillic support  %%%%%%%%%%%%%%%%%%%%%%%%
%%%%%%%%
\IfFileExists{extdash.sty}{\RequirePackage[shortcuts]{extdash}%
  \renewcommand{\cyrdash}{\scalebox{0.75}[1]{\textemdash}}}{}
\def\EXD@emdash{\RussianEnglish{\cyrdash}{---}}
\def\emdash{\RussianEnglish{\cyrdash}{---}}%
%

\catcode`\'=12

\def\etcname{\RussianEnglish{\Etcname}{etc.}}%

\def\set@logo#1{\hbox to\hsize{\fontsize{6}{7\p@}#1}}%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%% subjclass related

\renewcommand*\subjclass[2][1991]{%
  \@ifundefined{subjclassids@#1}{\ClassWarning {\@classname}{Unknown Subject Classification!}}{%
%  \expandafter\show\csname subjclassids@#1\endcsname
    \expandafter\gdef\csname subjclassids@#1\endcsname{\csname #1 \endcsname{#2}}}%
%  \expandafter\show\csname subjclassids@#1\endcsname
  }%
\expandafter\def\csname 2000 \endcsname#1{{\mscsubj #1, , \@nil}}%
\expandafter\def\csname 2010 \endcsname#1{{\mscsubj #1, , \@nil}}%
\expandafter\def\csname 2020 \endcsname#1{{\mscsubj #1, , \@nil}}%
\def\mscsubj#1; #2, #3,#4\@nil{\msclink{}{#1}\msclink{; }{#2}\msclink{, }{#3}}
\def\msclink#1#2{\@ifempty{#2}{}{#1\href{https://mathscinet.ams.org/mathscinet/search/mscbrowse.html?sk=default&sk=#2}{#2}}}%

\newcommand\l@ifundefined[1]{\@ifundefined{\languagename-#1}}%
\newcommand\l@nameuse[1]{\@nameuse{\languagename-#1}}%
\def\newsubjectclass#1{%
  \@namedef{subjclassids@#1}{}%
  \@namedef{setsubjclass#1}{%\tracingall
    \expandafter\expandafter\expandafter\@ifempty
        \expandafter\expandafter\expandafter{\csname subjclassids@#1\endcsname}{}{%
          {\tiny\ld@nameuse{#1name} {\@nameuse{subjclassids@#1}}\par
          }}}}%
\newsubjectclass{2000}%
\newsubjectclass{2010}%
\newsubjectclass{2020}%
\newsubjectclass{UDC}%
\newsubjectclass{BBC}%
\newsubjectclass{GRNTI}%
\@namedef{english-2000name}{\textsf{2000} {\scriptsize\emph{Mathematics Subject Classification}: }}%
\@namedef{english-2010name}{\textsf{2010} {\scriptsize\emph{Mathematics Subject Classification}: }}%
\@namedef{english-2020name}{\textsf{2020} {\scriptsize\emph{Mathematics Subject Classification}: }}%
\@namedef{russian-UDCname}{\href{https://udcsummary.info/php/index.php?lang=ru}{УДК}}%
\@namedef{english-UDCname}{\href{https://udcsummary.info/}{UDC}}%
\@namedef{english-BBCname}{\href{http://bbk.rsl.ru/external/bbk?block=ETALON}{BBC}}%
\@namedef{english-GRNTIname}{\href{http://scs.viniti.ru/rubtree/main.aspx?tree=RGNTI}{CSCSTI}}%
\def\ld@nameuse#1{\l@ifundefined{#1}{\csname default-#1\endcsname}{\l@nameuse{#1}}}%
% %% Paper design
%%
%
%%
%% 1. Page Dimensions
%%
\def\ps@firstpage{\ps@plain
  \def\@oddfoot{}%
  \def\@evenfoot{\@oddfoot}%
  \def\@oddhead{\@serieslogo}%
  \let\@evenhead\@oddhead % in case an article starts on a left-hand page
}%
\widowpenalty=500
\clubpenalty=500
\brokenpenalty=500
\interlinepenalty=100
\AtBeginDocument{\def\verbatim@font{\Small\ttfamily}\thispagestyle{empty}}%
%%
%% 2. Headline and strings
%%
\AtBeginDocument{\xdef\PSTAhsize{\the\hsize}}%
\def\ps@headings{\ps@empty
  \def\@evenhead{%
    \setTrue{runhead}%
    \let\savedlanguagename\languagename \let\languagename\headline@language \g@set@fontenc
    \scriptsize \hbox to \PSTAhsize
    {\rlap{\thepage}\let\ \space\hfil\scshape{\leftmark{}{}}\hfil\hskip0ptminus4.44mm}\hss\switch@language@icon
    \let\languagename\savedlanguagename  \g@set@fontenc}%
  \def\@oddhead{%
    \setFalse{runhead}%
    \let\savedlanguagename\languagename \let\languagename\headline@language \g@set@fontenc
    \scriptsize \hbox to  \PSTAhsize{\switch@language@icon
    \hfil\hskip0ptminus 4.44mm
    \scshape{\let\ \space\rightmark{}{}}\hfil \llap{\thepage}}%
    \let\languagename\savedlanguagename  \g@set@fontenc}}%
\AtBeginDocument{\allowdisplaybreaks[2]}%
\pagestyle{headings}%
\def\@captionheadfont{\small\scshape}%
\def\@captionfont{\small}%

%%
%% 3. Read metadata for title page and final info
%%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%% authors related
\def\JournalRubric#1{\def\JournalRubric@{\ifcase #1\PSTArubric\fi}}%
\def\ArticleType#1{\def\ArticleType@{\csname PSTA#1\endcsname}}\ArticleType{RAR}%
\def\languagePartRelatedDef#1{\@namedef{\languagePartRelated@@ #1}}%
\renewcommand{\title}[2][]{% \.Rtitle
%\tracingall
  \setRelated
  \TrimFinalSpace{\TrimStartingSpace{\languagePartRelated@\@titledefs{title}}}{#2}%
  \@ifempty{#1}%
    {\languagePartRelated@Let@{shorttitle}{title}}%
    {\TrimFinalSpace{\TrimStartingSpace{\prepend@shorttitle{\languagePartRelated@\@namedef}%
      {shorttitle}}}{#1}}%
  \@nameWlog{\languagePartRelated@@ title}%
  \@nameWlog{\languagePartRelated@@ shorttitle}%
  \@nameedef{\languagePartRelated@@ author.current}{0}
%\tracingnone
}%

%%
\def\prepend@shorttitle#1#2#3{#1{#2}{\let\subtitle\@gobble#3}}%
\def\@titledefs#1#2{%
  \@namedef{#1}{#2}%
  \pdfstringdef\Hy@gtemp{#2}%
  \@namelet{#1.pdfstring}\Hy@gtemp}%
%%
\def\@abstractenvname{abstract}%
\long\def\abstract#1\end{%
  \endgroup
  \TrimFinalSpace{\TrimStartingSpace{\long\languagePartRelatedDef{abstract}}}{#1}%
   \begingroup \def \@currenvir{abstract}\@endpefalse\end}%
\let\endabstract\@empty
%
\def\l@ValueDBname#1#2{%\l@ValueDBname{value}{DB name}
% example:\l@ValueDBname{Спиридонов, Александр Олегович}{author}%
% example:\l@ValueDBname{\KFPU }{address}%
  \expandafter\PrefixDBnameValue\expandafter{\languagePartRelated@@ }{#2}{#1}}%
\def\ValuexPrefixDBname#1#2#3{\edef\@tempa{{#2}{#3}}%
  \expandafter\expandafter\expandafter\PrefixDBnameValue\@tempa{#1}}%
\def\ePrefixDBnameValue#1#2#3{%
  \edef\@tempb{{#1}{#2}{#3}}%
  \wlog{\detokenize{\ePrefixDBnameValue{#1}{#2}{#3}}(\@tempb)}%
  \expandafter\expandafter\expandafter\PrefixDBnameValue\@tempb}%
\def\PrefixDBnameValue#1#2#3{%{\languagePartRelated@@ }{DB name}{value}%
  \edef \@tempb{#1#2}\expandafter \expandafter \expandafter
  \def \expandafter \expandafter \expandafter
  \@tempc \expandafter \expandafter \expandafter
  {\expandafter\detokenize\expandafter{\@tempb=#3}}%
  \expandafter\ifx\csname\@tempc\endcsname\relax
    \@ifundefined{#1#2.power}{\count@\@ne
      \gdef@cxA{#1#2.list}{\csname#2@format\endcsname{1}}%
    }{%
      \e@a@Tc\count@{#1#2.power}\advance \count@\@ne
      \gdef@cxxA{#1#2.list}%
         {\csname#1#2.list\expandafter\endcsname
         \csname#2@join\expandafter\endcsname
         \csname#2@format\expandafter\endcsname\expandafter
            {\number\count@}}}%
    \gdef@cA{#1#2.\number\count@}{#3}%
    \gdef@cxA{#1#2.power}{\number\count@}%
    \glet@cc{\@tempc}{#1#2.power}%
    \glet@cc{#1#2.current}{#1#2.power}%
  \else
    \glet@cc{#1#2.current}\@tempc%
  \fi
  }%

\def\appendNumberPrefixName#1#2#3{%
  \edef\@tempa{{#2}{#3}{authors}{}{#1}}%
  \expandafter\PrefixNameNumberEndingValue@\@tempa}%
\def\appendPrefixNameNumberEndingValue#1#2#3#4#5{%
  \edef\@tempa{{#1}{#2}{#3}{#4}{#5}}%
  \expandafter\PrefixNameNumberEndingValue@\@tempa}%
\def\PrefixNameNumberEndingValue@#1#2#3#4#5{%
  \wlog{\string\PrefixNameNumberEndingValue{#1}{#2}{#3}{#4}{#5}}%
  \wlog{@ifundefined{#1#2#3#4=#5}}%
  \@ifundefined{#1#2#3#4=#5}{%
  \xdef@cA{#1#2#3#4=#5}{y}%
  \expandafter\ifx\csname#1#2#3-#4.list\endcsname\relax
    \xdef@cA{#1#2#3-#4.list}{\expandafter\noexpand\csname#2-#4@format\endcsname{#5}}%
    \xdef@cA{#1#2#3-#4-dash}{n}%
    \global\let@cc{#1#2#3-#4-beforedash}{#1#2#3-#4.list}%
  \else
    \count@ = \@nameuse{#1#2#3-#4-lastid}%
    \advance\count@\@ne
    \ifnum #5 > \count@
      \xdef@cA{#1#2#3-#4.list}{%
        \csname #1#2#3-#4.list\endcsname
        \c@list@join
        \csname #2-#4@format\endcsname{#5}}%
      \global\let@cc{#1#2#3-#4-beforedash}{#1#2#3-#4.list}%
      \xdef@cA{#1#2#3-#4-dash}{n}%
    \else
      \if n\@nameuse{#1#2#3-#4-dash}%
        \xdef@cA{#1#2#3-#4-dash}{y}%
        \expandafter\g@addto@macro\csname#1#2#3-#4.list\expandafter\endcsname\expandafter
        {\expandafter\c@list@join\csname #2-#4@format\endcsname{#5}}%
        \@nameshow {#1#2#3-#4.list}%
      \else
        \xdef@cA{#1#2#3-#4.list}{%
          \csname #1#2#3-#4-beforedash\endcsname
          \noexpand\c@list@dash%
          \expandafter\noexpand\csname #2-#4@format\endcsname{#5}}%
      \fi\fi\fi
  \xdef@cA{#1#2#3-#4-lastid}{#5}}{}}%

\def\l@author@data@#1{\@author@data@{\languagePartRelated@@ }{#1}}
\def\@author@data@#1#2{% example: \l@author@data@{address}%
  \@namedef{#2}##1{%
    \@ifundefined{Num-of-common-#1#2es}{\gdef@cA{Num-of-common-#1#2es}{0}}{}%
    \expandafter\PrefixDBnameValue\expandafter{#1}{#2}{##1}%
    \languagePartRelated@\@ifundefined{author.current}%
      {\let@cc{Num-of-common-#1#2es}{#1#2.power}%
        \expandafter\expandafter\expandafter\l@ValueDBname
        \expandafter\expandafter\expandafter{\csname#1#2.current\endcsname}{Common-#2}}%
      {\appendPrefixNameNumberEndingValue{#1}{#2}{\csname #1#2.current\endcsname}{authors}{\csname\languagePartRelated@@ author.current\endcsname}%
        }}}%

\def \image#1{\@namedef {\role@\e@a@Tlc.{\role@.current}.image}{#1}\@nameshow{\role@\e@a@Tlc.{\role@.current}.image}}%
\def \imageurl#1{\@namedef {\role@.\csname\languagePartRelated@@ \role@.current\endcsname.imageurl}{#1}}%
\def \imageauthor{\futurelet\next\imageauthor@}%
\def \imageauthor@{\ifx\next[\expandafter\image@author@@\else\expandafter\image@author@\fi}%
\def \image@author@#1{\@namedef {\role@.\csname\languagePartRelated@@ \role@.current\endcsname.imageauthor}{\textcolor{verbatimnumbers}{#1}}}%
\def \image@author@@[#1]#2{\@namedef {\role@.\csname\languagePartRelated@@ \role@.current\endcsname.imageauthor}{\href{#1}{\textcolor{verbatimnumbers}{#2}}}}%
%
\def\orcid#1{\e@a@ScxA\def{\role@.\@nameuse{\languagePartRelated@@ \role@.current}.orcid}{#1}}%
%
\def\addtonameonce#1#2{%
  \@ifundefined{#1}%
    {\@namedef{#1}{#2}\@namedef{#1=<\detokenize{#2}>}{!}}%
    {\@ifundefined{#1=<\detokenize{#2}>}%
      {\expandafter\g@addto@macro\csname#1\endcsname{#2}}%
      {}}}%
\def\@article@id{\@ifundefined{article@id}{}{\article@id-}}%
\def\@email{\@article@id email}
\def\email@#1{\expandafter\expandafter\expandafter
  \PrefixDBnameValue\expandafter\expandafter\expandafter
  {\expandafter\expandafter\expandafter
  }\expandafter\expandafter\expandafter{\@email}{#1}%
  \addtonameonce{author\csname\languagePartRelated@@ author.current\endcsname-\@email.list}{\hboxemail{#1}}%
  \@ifundefined{\@email\csname\@email.current\endcsname.author}{%
    \e@a@SclC\edef{\@email\csname\@email.current\endcsname.author}{author.current}}%
  \expandafter\ifnum \csname\@email\csname\@email.current\endcsname.author\endcsname=
      \csname\languagePartRelated@@ author.current\endcsname
    \else \errmessage{Different authors \csname\@email\csname\@email.current\endcsname.author\endcsname\space and
      \csname\languagePartRelated@@ author.current\endcsname\space have the same email <\csname\@email.\csname\@email.current\endcsname\endcsname>!}\fi}%
\def \email{\catcode`\_=12 \catcode`\%=12 \catcode`\$=12 \catcode`\&=12 \catcode`\"=12 \catcode`\^=12 \email@@}%
\def\email@@#1{\email@{#1}\catcode`\_=8 \catcode`\%=14 \catcode`\$=3 \catcode`\&=4 \catcode`\"=13 \catcode`\^=7 }%
\def \correspondent{\ePrefixDBnameValue {correspondent-\@article@id}{email}{\csname\@email.current\endcsname}%
  \appendPrefixNameNumberEndingValue {\@article@id}{correspondent-}{\csname\@email.current\endcsname}{authors}%
    {\csname\languagePartRelated@@ author.current\endcsname}%
  \gdef@lcA{author\@nameuse{\languagePartRelated@@ author.current}.envelope}{\emailicon}}%
\def\emailicon{$^{\includegraphics[width=5pt, height=4pt]{psta/envelope.pdf}}$}%
%
\def \CRediTdetails#1,{\@ifnextchar .% e.g. 1[conceptualization],. or 1,.
    {\CRediTdetailLast#1[]\@gobble}%
    {\CRediTdetailNonLast#1[]}}%
\def \CRediTdetailLast#1[{\@ifnextchar ]% e.g. 11[]
    {\ifcase#1\PSTACRediT\fi\@gobble}%
    {\CRediTLast}}%
\def \CRediTLast#1][]{#1}%
\def \CRediTdetailNonLast#1[{\@ifnextchar ]% e.g. 11[]
    {\ifcase#1\PSTACRediT\fi\CRediTjoin@\expandafter\CRediTdetails\@gobble}%
    {\CRediTNext}}%
\def \CRediTjoin@{, }%
\def \CRediTNext#1][]{#1\CRediTjoin@ \CRediTdetails}%
\def \CRediT#1#2{\e@a@Tlc\def{\role@.\csname\languagePartRelated@@ \role@.current\endcsname
      .CRediT}{#2 (\CRediTdetails#1,.)}%
    \@nameshow{\languagePartRelated@@ \role@.\csname\languagePartRelated@@ \role@.current\endcsname.CRediT}% % DEBUGDING !!!
    }%
\long\def\info#1{\long\e@a@Tlc\def{\role@.\@nameuse{\languagePartRelated@@ \role@.current}.info}{#1}}%
\l@author@data@{thanks}\let\thanks@\thanks
\expandafter\def\expandafter\do@thanks\expandafter#\expandafter1\expandafter{\thanks@{#1}\catcode`_=8 }%
\def \thanks{\catcode`_=12 \do@thanks}%
\l@author@data@{address}%

\def\shortauthors#1{\if y\psta@blind\else\e@a@Tlc\def{headlineauthors}{#1}\fi}%
\def\headlineauthors#1{\if y\psta@blind\else
    \expandafter\def\csname \languagename-author.headlines\endcsname{#1}}%
%
%
\def\abbrevCompositNames#1-#2\@nil{%\tracingall
  \abbrevInitial#1\@nil
  \def\otherCompositNames{#2}%
  \ifx\otherCompositNames\@singleHyphen
  \else
    \ifx\empty\otherCompositNames\else
      \addTo@\Initials{-}%
      \abbrevCompositNames#2\@nil\fi\fi}%
%
\def\@singleHyphen{-}
%
\def\abbrevOtherNames#1 #2\@nil{%\tracingall
  \abbrevInitial#1\@nil
  \def\otherNames{#2}%
  \ifx\otherNames\between@initials
  \else
    \ifx\otherNames\@singleHyphen
      \else
      \ifx\empty\otherNames\else
        \addTo@\Initials{\between@initials}%
        \abbrevOtherNames#2\@nil\fi\fi\fi}%
%
\def\abbrevInitial{%
  \futurelet\@lettoken\abbrevInitial@}
\def\abbrevInitial@{%\tracingall%
  \ifx\@lettoken\@nil
    \let\pstaI@next\@gobble
  \else
    \ifx\@lettoken\bgroup
      \let\pstaI@next\abbrevPassiveInitial
    \else
      \expandafter\ifcat\noexpand\@lettoken\relax
        \let\pstaI@next\abbrevActiveInitial
      \else
        \let\pstaI@next\abbrevActiveInitial
  \fi\fi\fi\pstaI@next}
%
\def\abbrevActiveInitial#1#2#3\@nil{%
  \addTo@\Initials{#1#2.}}
\def\abbrevPassiveInitial#1#2\@nil{%
  \addTo@\Initials{#1.}}
%
\catcode`!=13
\def\trimmedAroundDef#1#2#3{%
  \TrimFinalSpace{\TrimStartingSpace{\def!}}{#3}%
  \@namelet{#1.#2}!%
  \@nameWlog{#1.#2}}
%
\def\@extract@names#1#2,#3,#4\@nil{%
  \trimmedAroundDef{#1}{lastName}{#2}%
  \trimmedAroundDef{#1}{nonabbreviatedNames}{#3}%
  \ifx!\empty
    \let\firstName@\empty
    \let\otherNames@\empty
    \let\otherInitials@\empty
  \else
    \expandafter\selectFirstAndOtherNames! \@nil
  \fi
  \@namelet{#1.firstName}\firstName@
  \@nameWlog{#1.firstName}%
  \@namelet{#1.otherNames}\otherNames@
  \@nameWlog{#1.otherNames}%
  \@namelet{#1.firstInitial}\firstInitial@
  \@nameWlog{#1.firstInitial}%
  \@namelet{#1.otherInitials}\otherInitials@
  \@nameWlog{#1.otherInitials}%
% example: \russian-author.1.otherInitials=macro:->{В}.
}
%
\def\selectFirstAndOtherNames#1 #2\@nil{%\tracingall
  \let\Initials\empty
  \def\firstName@{#1}%
  \abbrevCompositNames#1-\@nil
  \let\firstInitial@\Initials
  \let\Initials\empty
  \def\otherNames@{#2}%
  \wlogToken\otherNames@
  \wlogToken\empty
  \ifx\otherNames@\empty
    \let\otherInitials@\empty
  \else
    \abbrevOtherNames#2 \@nil
    \let\otherInitials@\Initials\fi}%
%
%
\def\abbrevCompositNames#1-#2\@nil{%\tracingall
  \abbrevInitial#1\@nil
  \edef\otherCompositNames{#2}%
  \ifx\otherCompositNames\@singleHyphen
  \else
    \ifx\empty\otherCompositNames\else
      \addTo@\Initials{-}%
      \abbrevCompositNames#2\@nil\fi\fi}%
%
\def\@singleHyphen{-}
%
\def\abbrevOtherNames#1 #2\@nil{%\tracingall
  \abbrevInitial#1\@nil
  \edef\otherNames{#2}%
    \wlogToken\otherNames@
    \ifx\space\otherNames\else
      \ifx\empty\otherNames\else
        \addTo@\Initials{\between@initials}%
        \abbrevOtherNames#2\@nil\fi\fi}%
%
\def\abbrevInitial{%
  \futurelet\@lettoken\abbrevInitial@}
\def\abbrevInitial@{%\tracingall%
  \ifx\@lettoken\@nil
    \let\pstaI@next\@gobble
  \else
    \ifx\@lettoken\bgroup
      \let\pstaI@next\abbrevPassiveInitial
    \else
      \expandafter\ifcat\noexpand\@lettoken\relax
        \let\pstaI@next\abbrevActiveInitial
      \else
        \let\pstaI@next\abbrevPassiveInitial
  \fi\fi\fi\pstaI@next}
%
\def\abbrevActiveInitial#1#2#3\@nil{%
  \addTo@\Initials{#1#2.}}
\def\abbrevPassiveInitial#1#2\@nil{%
  \addTo@\Initials{#1.}}


\catcode`!=12
\def\between@initials{\kern.1em}%
\def\person@#1#2{% #1=role #2-Names
  \xdef\role@{#1}%
  \l@ValueDBname{#2}{#1}%
%  \edef\authorRelated@##1##2{##1{\languagePartRelated@@#1.\number\count@##2}}%
  \edef\@@csPrefixes{\expandafter\@joinedPrefixes\@csPrefixes{#1}{.\number\count@}}%
  \expandafter\@makeAuthorNameLists\@@csPrefixes{#2}}%

\def\@joinedPrefixes#1#2#3#4#5{{#1#3#4#5}{#1#3}{#4s}}%
\def\@makeAuthorNameLists#1#2#3#4{%
  \@extract@names{#1}#4, ,\@nil
  \expandafter\ifx\csname#1.otherInitials\endcsname\empty
    \@nameletFromName{#1.initials}{#1.firstInitial}%
  \else
    \@namesJoin {#1.initials}{#1.firstInitial}{\between@initials}{#1.otherInitials}\fi
  \@nameWlog{#1.initials}%
% example: \russian-author.1.initials=macro:->{А}.\,{В}.

  \@namesJoin {#1.FIO}{#1.lastName}{~}{#1.initials}%
  \@nameWlog{#1.FIO}
% example: \russian-author.1.FIO=macro:->Головешкин~{А}.\,{В}.
  \@namesJoin {#1.IOF}{#1.initials}{~}{#1.lastName}%
  \@nameWlog{#1.IOF}
% example: \english-author.1.IOF=macro:->A.\,V.~Goloveshkin
% example: \russian-author.1.IOF=macro:->{А}.~{В}.~Головешкин
   \expandafter\ifx\csname#1.otherInitials\endcsname\empty
    \@nameletFromName{#1.firstNameO}{#1.firstName}%
  \else
    \@namesJoin {#1.firstNameO}{#1.firstName}{~}{#1.otherInitials}\fi
  \@namesJoin {#1.firstNameOF}{#1.firstNameO}{~}{#1.lastName}%
  \@nameWlog{#1.firstNameOF}
% example: \english-author.1.firstNameOF=macro:->Alexey~V.~Goloveshkin
  \@ifundefined{#2#3.FIO}%
    {\@nameletFromName{#2#3.FIO}{#1.FIO}}%
    {\@namesJoin{#2#3.FIO}{#2#3.FIO}{, }{#1.FIO}}%
  \@nameWlog{#2#3.FIO}
  \@ifundefined{#2#3.IOF}%
    {\@nameletFromName{#2#3.IOF}{#1.IOF}}%
    {\@namesJoin{#2#3.IOF}{#2#3.IOF}{, }{#1.IOF}}%
  \@nameWlog{#2#3.IOF}
  \@ifundefined{#2#3.firstNameOF}%
    {\@nameletFromName{#2#3.firstNameOF}{#1.firstNameOF}}%
    {\@namesJoin{#2#3.firstNameOF}{#2#3.firstNameOF}{, }{#1.firstNameOF}}%
  \@nameWlog{#2#3.firstNameOF}%
  \@nameletFromName{#2headline#3}{#2#3.\RussianEnglish{IOF}{firstNameOF}}
}%

%

\renewcommand{\author}[1]{%
  \if  y\psta@blind\person@{author}{??, ? ?} \else\person@{author}{#1}\fi
  }%

\def\cyr@author#1#2#3,#4\@nil{#1~#3}%
\def\lat@author#1#2#3,#4\@nil{#2~#3}%
%
%\def\@secondofthree#1#2#3{#2}%
%\def\@thirdofthree#1#2#3{#3}%
\def\submittedby#1{\@namedef{\languagePartRelated@@ PSTA@recommended}{#1}}%
\def \ReceivedRevisedPublished#1 #2 #3 {%
  \def\PSTA@history{\medskip
    \historyLineFormat{\PSTAreceived}{#1;}
    \historyLineFormat{\PSTArevised}{#2;}
    \historyLineFormat{\PSTApublished}{#3.}}
    \def\PSTA@stamp{#3}}%
\def \ReceivedRevisedAcceptedPublished#1 #2 #3 #4 {%
  \def\PSTA@history{\medskip
    \historyLineFormat{\PSTAreceived}{#1;}
    \historyLineFormat{\PSTArevised}{#2;}
    \historyLineFormat{\PSTAaccepted}{#3;}
    \historyLineFormat{\PSTApublished}{#4.}}%
  \def\PSTA@stamp{#4}}%
\gdef\psta@doiversion{}%
\gdef\extrayear{}%
\def\pstaPublished#1#2{%
  \g@addto@macro{\PSTA@history}%
    {\historyLineFormat{\PSTApublished}%
      {#1\rlap{ {\href
        {https://doi.org/\PSTAdoi\pagerange#2}%
        {\DOIicon\quad\PSTAdoi\pagerange#2}}}}}}%
\def\pstaAccepted#1#2{\g@addto@macro{%
  \PSTA@history}{\historyLineFormat{\PSTAaccepted}%
  {#1\rlap{ {\href
    {https://doi.org/\PSTAdoi\pagerange#2}%
    {\DOIicon\quad\PSTAdoi\pagerange#2}}}}}}%
\def\pstaCorrected#1#2#3{%
  \g@addto@macro{\PSTA@history}%
    {\historyLineFormat{\PSTAcorrected}{#1}}%
  \def\PSTA@stamp{#1}%
  \gdef\psta@doiversion{#2}%
  \def\copyrightYear{#3}}%
\def \PublicationHistory#1 #2 #3 {%
  \let\Published\pstaPublished
  \let\Corrected\pstaCorrected
  \def\PSTA@history{\medskip
  \historyLineFormat{\PSTAreceived}{#1}\par
  \historyLineFormat{\PSTArevised}{#2}\par}#3}%
\let\ReceivedRevisedPublishedHistory\PublicationHistory
\let\copyrightYear\Year
\def \received#1 {\def\PSTA@received{#1}}%
\def  \revised#1 {\def\PSTA@revised{#1}}%
\def \accepted#1 {\def\PSTA@accepted{#1}}%
\def\published#1 {%
  \ReceivedRevisedPublished{%
    \PSTA@received} {\PSTA@revised} %
    \@ifundefined{PSTA@accepted}{}{{\PSTA@accepted}} {#1} }%


%%%%%%%%%%%%%%%%%%%%%%%%%%%%% format thanks, info, image
\def\swap@fio#1, #2\endswap@fio{#2 #1}%
\def\swap@fio@#1, #2\endswap@fio{{\footnotesize{{#2}} %
  \small\textbf{#1}}}%
\def\format@info#1{{%
  \def\hboxemail##1{\hbox{\hrefemail{##1}}}%
  \hypertarget{\languagePartRelated@@ author.#1}{\begingroup
    \small \hfil\textsf{{}\expandafter\expandafter\expandafter
    \swap@fio\csname\languagePartRelated@@ author.#1\endcsname\endswap@fio}%
    \vadjust{\vskip2pt}\newline
    \languagePartRelated@\@ifundefined{author.#1.info}{\@nameuse{\languagePartRelated@@ author.#1.address}}%
        {\@nameuse{\languagePartRelated@@ author.#1.info}}
    \vskip\medskipamount
    \@ifundefined{author.#1.orcid}{}{\edef\orcid@url{\@nameuse{author.#1.orcid}}%
      \hbox{\hskip3cm\llap{\hss\iDicon\quad}\quad
      \href{https://orcid.org/\orcid@url}{\scriptsize
      \expandafter\nolinkurl\expandafter{\orcid@url}}}}%
    \hbox{\hskip3cm\sffamily\scriptsize\itshape
      \languagePartRelated@\@ifundefined{author#1.envelope}{}{\bfseries}\llap
      {e-mail:}\quad \vtop{\csname author#1-\@email.list\endcsname}}%
    \endgroup}
  \parfillskip0pt \@@par\parfillskip0pt \@@par}}
\def\includeauthorgraphics#1{\leavevmode\llap
  {\rotatebox{90}{\rlap{\scalebox{.5}{\vbox
    {\hsize\maxdimen\noindent\Large\textsf{#1}\@@par\vskip3mm}}}}}}%

\def\author@join@info{\par \csname BetweenAuthorsInfos \endcsname}
\def\author@format@info#1{%
    \immediate\write\@auxout{\string\gdef\string\authorsinfo@languagename{\languagename}}%
    \@ifundefined{author.#1.image}%
        {\noindent\leavevmode\format@info{#1}{\parfillskip\z@\@@par}}%
        {\hbox to \hsize{\hss
            $\vcenter{\hbox{%
               \@ifundefined{author.#1.imageauthor}{}{%
                \includeauthorgraphics{\csname author.#1.imageauthor\endcsname}}%
                {\expandafter\@secondfirstoftwo\expandafter
                    {\expandafter{\csname author.#1.image\endcsname}}%
                    {\includegraphics[width=\@AuthorImageWidth]}%
        }}}\hskip2mm
         \vcenter{\vbox{\advance\hsize-\@AuthorImageWidth\advance\hsize-2mm\null\format@info{#1}{\parfillskip\z@\@@par}}}$\hss}}}%
\def\shortauthor@format#1{%
    \@nameuse{\languagePartRelated@@ shortauthor.#1} \authorsmark{#1}}%
\let\authorsinfo@languagename\@gobble
\def\author@format@intitle#1{\hyperlink{\languagePartRelated@\@ifundefined{authorsinfo@page}{\authorsinfo@languagename
      }{\languagename}-\@article@id author.#1}{\expandafter\expandafter\expandafter
    \swap@fio@\csname\languagePartRelated@@ author.#1\endcsname\endswap@fio
    \authorsmark{#1}\@nameuse{\languagePartRelated@@ author#1.envelope}}}%
\def\noauthormarks{\global\let\authorsmark\@gobble}\noauthormarks
\def\author@join@intitle{, \penalty -2}%
\def\address@join{,\newline}%
\let\thanks@join=\address@join
\def\c@list@join{,\,}%
\def\c@list@dash{--}%

\def\authorsmark@#1{%
  \leavevmode \raise.7ex\hbox{\scalebox{0.75}{\textcolor
    {authorsmarks}{{\tiny\bfseries{\textsf{#1}}}}}}}%

\def\authorsmarkleft#1{\llap{\authorsmark{#1}}}%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%% keywords related
\def\keywords#1{\e@a@Tlc\def {keywords}{#1}}%
\def\dedication#1#2{\e@a@Tlc\def {dedication}{\vbox{\hsize= #1 \noindent\textcolor[rgb]{0,0.4,0.6}{\emph{#2}}}}}%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%% abstract related
\def\@abstractenvname{abstract}%
\edef\abstract@envir{abstract}%
\long\def\abstract#1\end#2{\endgroup
  \long\global\expandafter\def\csname \languagePartRelated@@ abstract\endcsname{#1}%
  \edef\close@env{#2}%
  \ifx\abstract@envir\close@env
    \expandafter\@firstoftwo\else\expandafter\@secondoftwo\fi
    {\begingroup \def \@currenvir{abstract}\@endpefalse\end{#2}}%
    {\extend@abstract{#2}}}%
\long\def\extend@abstract#1#2\end#3{%\endgroup
  \wlog{#1...#3}%
  \long\global\expandafter\def\csname \languagePartRelated@@ abstract%
    \expandafter\expandafter\expandafter\endcsname
    \expandafter\expandafter\expandafter{%
    \csname \languagePartRelated@@ abstract\endcsname\end{#1}#2}%
  \edef\close@env{#3}%
  \ifx\abstract@envir\close@env
    \expandafter\@firstoftwo\else\expandafter\@secondfirstoftwo\fi
    {\begingroup \def \@currenvir{abstract}\@endpefalse\end{#3}}%
    {\end{#3}\extend@abstract}}%
\let\endabstract\@empty
%%% for maketitle {{{1
\def\check@author@attribute@#1{{%
    \expandafter \ifx\csname russian-\@article@id#1\expandafter\endcsname\csname english-\@article@id#1\endcsname \else\errhelp{Check the author's addresses in both languages, please!}\errmessage
      {#1 isn't the same in different languages (\@nameuse{russian-\@article@id#1} != \@nameuse{english-\@article@id#1})!}\fi}}%
 \@namedef{address-authors@format}#1{#1}%
 \@namedef{thanks-authors@format}#1{#1}%
\def\check@author@attribute#1{{%
    \dimen@\z@
    \@namedef{#1@format}##1{%
      \check@author@attribute@{#1##1-authors.list}%
      \e@a@Tlc\ifx{#1##1-authors.list}\relax\else
        \e@a@Tlc\ifnum{author.current}>1
        %\@nameshow{address-authors@format}%
          \setbox\@tempboxa=\hbox{\authorsmark@{%
            \@nameuse{\languagePartRelated@@ #1##1-authors.list}\kern.2em}}%
          %\showbox\@tempboxa
          %\wlog{wd(#1-authormarks) = \the\wd\@tempboxa}%
          \ifdim\dimen@<\wd\@tempboxa
            \dimen@=\wd\@tempboxa\fi\fi\fi}%
    \@namedef{author-#1@join}##1##2{}%
    \@namedef{#1@join}{}%
    \@nameuse{\languagePartRelated@@ #1.list}%
    \gdef@lcxxA{#1-authors-len}{\the\dimen@}}}%
\def\@email@format#1{%
  \@ifundefined{\@email#1-authors.list}{}%
      {\@ifundefined{\@email#1}{}{
        \authorsmark{\@nameuse{\@email#1-authors.list}{\kern.2em}}%
  \@nameuse{\languagePartRelated@@ \@email.#1}}}}%
\def\author@atribute@format#1#2{%
%\tracingall
  \languagePartRelated@\@ifundefined{#2#1-authors.list}{}%
      {\authorsmarkleft{\@nameuse{\languagePartRelated@@ #2#1-authors.list}{\kern.2em}}%
  \@nameuse{\languagePartRelated@@ #2.#1}}}%
\def\list@address@or@thanks#1{%
  \languagePartRelated@\@ifundefined{Common-#1.list}{}{%
    \check@author@attribute{Common-#1}%
    \l@use@format@join{Common-#1}%
    {##1{\@nameuse{\languagePartRelated@@ #1.##1}}}%
    {{\newline}}}%
  \@ifundefined{Num-of-common-\languagePartRelated@@ #1es}{}{%
    \ifnum\@nameuse{Num-of-common-\languagePartRelated@@ #1es} < \@nameuse{\languagePartRelated@@ address.current}%
      %\@nameshow{\languagePartRelated@@ #1-authors-len}%
      \par\parindent\z@\leftskip=\@nameuse{\languagePartRelated@@ #1-authors-len}%
      \l@use@format@join{#1}%
        {##1{\author@atribute@format{##1}{#1}%
          \ifnum\@nameuse{Num-of-common-\languagePartRelated@@ #1es}<##1 %
            \global\let\g@tempc\newline
          \else\global\let\g@tempc\@empty\fi}}%
        {{{\g@tempc}}}\fi}}%
\def\l@use@format@join#1#2#3{\leavevmode
  \languagePartRelated@\@ifundefined{#1.list}{%
    \@ifundefined{#1.list}{}{%
      \@namedef{#1@format}#2%
      \@namedef{#1@join}#3\@nameuse{#1.list}%
  }}{%
    \check@author@attribute{#1}%
    \@namedef{#1@format}#2%
    \@namedef{#1@join}#3\@nameuse{\languagePartRelated@@ #1.list}}}%
\def\email@format#1{\authorsmark{\@nameuse{\@email\@nameuse{correspondent-\@email.#1}.author}}\correspondent@format@{\@nameuse{correspondent-\@email.#1}}}%
\def\correspondent@format@#1{\emailicon\!\hrefemail{\csname \@email.#1\endcsname}}%
\def\hrefemail#1{\href{mailto: #1}{#1}}%
\def\email@join{, \penalty 2 }%
\def\notitlepage#1#2{\@namedef{done#1#2}{!}}%
\def\formatPagerange#1{\expandafter\formatPagerange@#1-;\endPagerange}%
\def\formatPagerange@#1-#2#3\endPagerange{\formatPagerange@@#1-;\endPagerange
   \if;#2\else--\formatPagerange@@#2#3\endPagerange\fi}%
  \def\formatPagerange@@#1-;\endPagerange{%\href[page=#1]{psta\Year\_\Issue}%
    {#1}}%

%%%%%%%%%%%%%%%%%%%%%%%%%%%%% maketitle
\font\colonTitlefont=larm1000  at 6pt%
\font\boldcolonTitlefont=labx1000  at 6pt%
\gdef\psta@leftline@{{\headline@language@\pstaleftline}}%
\gdef\psta@rightline@{{\headline@language@\pstarightline}}%
\gdef\pstamarkleft#1{\gdef\pstaleftline{#1}\psta@mark@update}%
\gdef\pstamarkright#1{\gdef\pstarightline{#1}\psta@mark@update}%
\gdef\pstamarkboth#1#2{\gdef\pstaleftline{#1}\gdef\pstarightline{#2}\psta@mark@update}%
\gdef\psta@mark@update{%\tracingall
\latexmarkboth{\protect\psta@leftline@}{\protect\psta@rightline@}%\tracingnone
}%
\gdef\headline@language@{\let\languagename\headline@language\let\language@group\languagename
    \patchpdfheadlineencoding}%
\def\JournalRubric#1{\def\JournalRubric@{\ifcase #1\PSTArubric\fi}}%
\def\ArticleType#1{\def\ArticleType@{\csname PSTA#1\endcsname}}\ArticleType{RAR}%
\def\switch@language@icon@#1#2{%
  \@ifundefined{\@article@id the@first@page}{\expandafter
      \def\csname\@article@id the@first@page\endcsname{\the\c@page}}{}%
  \hypertarget{#1-\@article@id page\number\c@page}\strut
  \wlog{hypertarget{#1-\@article@id page\number\c@page}}\strut
  \@ifundefined{#1-\@article@id named@page.list}%
   {%
    %\wlog{undefined{#1-\@article@id named@page.list}%
   }{%
    \let\named@page@join\relax
    \def\named@page@format##1{%
      \ifnum\the\c@page < \@nameuse{#1-\@article@id \@nameuse{#1-\@article@id named@page.##1}@page}
   %     \wlog{\the\c@page < \@nameuse{#1-\@article@id \@nameuse{#1-\@article@id named@page.##1}@page}}%
      \else
   %     \wlog{\the\c@page !< \@nameuse{#1-\@article@id \@nameuse{#1-\@article@id named@page.##1}@page}}%
       % \ifnum \@nameuse{#2-\@article@id named@page.current}>##1
        \@ifundefined{#2-\@article@id \@nameuse{#1-\@article@id named@page.##1}@page}{%
          \wlog{undefined{#2-\@article@id \@nameuse{#1-\@article@id named@page.##1}@page}}%
        }{%
          \@tempcnta\the\c@page
          \advance\@tempcnta by\@nameuse{#2-\@article@id \@nameuse{#1-\@article@id named@page.##1}@page}%
          \advance\@tempcnta-\@nameuse{#1-\@article@id \@nameuse{#1-\@article@id named@page.##1}@page}\relax
   %     \wlog{\the\c@page--\@nameuse{#1-\@article@id \@nameuse{#1-\@article@id named@page.##1}@page}
   %         +\@nameuse{#2-\@article@id \@nameuse{#1-\@article@id named@page.##1}@page}=\the \@tempcnta}%
        \@ifundefined{#1-\@article@id thebibliography@page}{}%
           {\ifnum \c@page>\csname#1-\@article@id maketitle@page\endcsname
                \@ifundefined{#2-\@article@id thebibliography@page}%
                  {\@tempcnta=\@abspage@last\advance\@tempcnta \csname \@article@id the@first@page\endcsname }%
                  {\ifnum \@nameuse{#2-\@article@id thebibliography@page}%
                        <\numexpr\@nameuse{#2-\@article@id maketitle@page}+2\relax
                    \ifnum \c@page<\csname#1-\@article@id thebibliography@page\endcsname
    %                  \wlog{{#1}{#2}(\the\c@page<\csname#1-\@article@id thebibliography@page\endcsname)&(\the
    %                        \c@page>\csname#1-\@article@id maketitle@page\endcsname)&(\@nameuse
    %                        {#2-\@article@id thebibliography@page}<\numexpr\@nameuse{#2-\@article@id maketitle@page}+2\relax)}%
                      \@tempcnta=\numexpr\@abspage@last+\the@first@page\relax
                    \fi\fi}\fi}%
        }\fi
    %\wlog{{#2-page \the\@tempcnta<?>\@abspage@last+\the@first@page-1}}%
    }{%
    \@nameuse{#1-\@article@id named@page.list}%
    \ifnum\the\@tempcnta<\numexpr\@abspage@last+\the@first@page\relax
     % \wlog{hyperlink{#2-\@article@id page\the\@tempcnta} \numexpr\@abspage@last+\the@first@page}%
      $\vcenter{\hbox{\hyperlink{#2-\@article@id page\the\@tempcnta}{\includegraphics[width=6mm]{psta/leave-#1}}}}$\fi}}}%
\AtBeginDocument{\edef\the@first@page{\the\c@page}}\let\article@id\@empty
\def\maketitle{\par \if y\psta@blind \vfill\fi
  \@ifundefined{landscapeClearpage}\pagebreak{\pagegoal\vsize}%
  \@ifundefined{IssueDOI}{\let\IssueDOI\@gobble}{}%
  \@ifundefined{pagerange}{\global\let\pagerange\@empty}{}%
  \global\let\article@lang\languagename
  \RussianEnglish{\set@headline@encoding{russian}}{\set@headline@encoding{english}}%
   \wlog{maketitle \languagename}%
  \setRelated
  \@topnum\z@ % this prevents figures from falling at the top of page 1
  \languagePartRelated@\@ifundefined{maketitle}{%
    \topmargin=\RussianEnglish{11}{12}mm
    \textheight=\RussianEnglish{170}{167}mm
    \textwidth=\RussianEnglish{116}{111}mm
    \linewidth=\textwidth \columnwidth=\textwidth \hsize=\textwidth
    \xdef\PSTAhsize{\the\hsize}%
    \evensidemargin=\RussianEnglish{16}{18.5}mm
    \oddsidemargin =\RussianEnglish{16}{18.5}mm
%    \def\Russian{\selectlanguage{russian}}%
%    \def\English{\selectlanguage{english}}%
    \@namedef{\languagePartRelated@@ maketitle}{}%
    \expandafter\@maketitle\expandafter{\languagename}}{}}%
\def\@tempa#1-#2-#3.{\xdef\psta@lastpage{#2}}%
\@ifundefined{pstarussianpartonly}{}{%
  \expandafter\@tempa\pagerange-3-.%
  \global\let\maketitle@\maketitle
  \long\gdef\maketitle#1\maketitle{%
    \let\switch@language@icon\relax
    \advance\c@page\psta@lastpage
    \advance\c@page 1 %
    \divide\c@page 2 \Russian
    \maketitle@}}%
\def\NamedLanguagePage#1{\global\expandafter\edef\csname #1@page\endcsname{\the\c@page}%
  %\write\@auxout{\string\NamedLanguagePage@{\languagePartRelated@@}{#1}{\the \c@page}}
  }%
\def\NamedLanguagePage@#1#2#3{\global\@namedef{#1#2@page}{#3}\@nameshow{#1#2@page}%
  \PrefixDBnameValue{#1}{named@page}{#2}}%
\edef\stringhash{\string#}%
\def\second@bgroup@third@minus@first@egroup#1#2#3{#2{#3-#1}}%
\def\add@prefix#1#2{\@ifundefined{no-prefix-\string#2}{\expandafter
  \let\csname no-prefix-\string#2\endcsname#2}{}\expandafter
  \second@bgroup@third@minus@first@egroup\csname no-prefix-\string#2\endcsname
  {\def#2}{#1}}%
\def\languagePartRelated@@{\languagename-\@article@id}%
\def\@maketitle#1{%
  \selectlanguage{#1}%
  \ifx\russian@lang\article@lang
    \let\@@ref\gost@@ref \let\@ifgost\@firstoftwo \let\LastPunct\empty
    \csname HyLang@russian\endcsname
  \else
    \csname HyLang@english\endcsname
    \let\@@ref\ams@@ref\let\@ifgost\@secondoftwo\let\LastPunct.\fi
  \@ifundefined{pstaenglishspartonly}{%
    \setcounter{figure}{0}
    \setcounter{table}{0}
    \setcounter{section}{0}
    \setcounter{equation}{0}
    \setcounter{footnote}{0}
    \@ifundefined{c@theorem}{}{\setcounter{theorem}{0}}\add@prefix{\languagePartRelated@@ }\theHtheorem
    \@ifundefined{c@remark}{}{\setcounter{remark}{0}\add@prefix{\languagePartRelated@@ }\theHremark}
    \@ifundefined{c@problem}{}{\setcounter{problem}{0}\add@prefix{\languagePartRelated@@ }\theHproblem}
    \@ifundefined{c@axiom}{}{\setcounter{axiom}{0}\add@prefix{\languagePartRelated@@ }\theHaxiom}
    \@ifundefined{c@hypothesis}{}{\setcounter{hypothesis}{0}\add@prefix{\languagePartRelated@@ }\theHhypothesis}
    \@ifundefined{c@note}{}{\setcounter{note}{0}\add@prefix{\languagePartRelated@@ }\theHnote}
    \@ifundefined{c@definition}{}{\setcounter{definition}{0}\add@prefix{\languagePartRelated@@ }\theHdefinition}
    \@ifundefined{c@corollary}{}{\setcounter{corollary}{0}\add@prefix{\languagePartRelated@@ }\theHcorollary}
    \@ifundefined{c@example}{}{\setcounter{example}{0}\add@prefix{\languagePartRelated@@ }\theHexample}
    \@ifundefined{c@lemma}{}{\setcounter{lemma}{0}\add@prefix{\languagePartRelated@@ }\theHlemma}
    \@ifundefined{c@statement}{}{\setcounter{statement}{0}\add@prefix{\languagePartRelated@@ }\theHstatement}
    \@ifundefined{c@thm}{}{\setcounter{thm}{0}\add@prefix{\languagePartRelated@@ }\theHthm}
    \@ifundefined{c@proposition}{}{\setcounter{proposition}{0}\add@prefix{\languagePartRelated@@ }\theHproposition}
    \expandafter\add@prefix\expandafter{\languagePartRelated@@}\theHfigure
    \expandafter\add@prefix\expandafter{\languagePartRelated@@}\theHtable
    \expandafter\add@prefix\expandafter{\languagePartRelated@@}\theHsection
    \@ifundefined{subcaption}{}%
          {\renewcommand\thesubfigure{\textit{\ifx\russian@lang\article@lang\pstarus\alph{subfigure}\else\alph{subfigure}\fi}}}%
    \@ifundefined{@saved@thm}{\let \@saved@thm\@thm}{}%
      \def\@thm{\relax\ifvmode\pagebreak[2]\else\pagebreak[1]\fi \vskip\parskip\@saved@thm}%
    \ifx\russian@lang\article@lang \def\fps@figure{ht}\def\fps@table{ht}\else \def\fps@figure{tbp}\def\fps@table{tbp}\fi%
    \@ifundefined{no@prefix@InnerCite}{\let\no@prefix@InnerCite\InnerCite}{}%
    \edef\InnerCite##1{\noexpand\no@prefix@InnerCite{\languagePartRelated@@##1}}%
    %\@nameshow{InnerCite}%
  %  \@ifundefined{no@prefix@eqref}{\let\no@prefix@eqref\eqref}{}%
  %  \def\eqref##1{\no@prefix@eqref{#1-##1}}%
  %  \@nameshow{eqref}%
  %  \@nameshow{no@prefix@eqref}%
    \write\@auxout{\string\@ifundefined{nnewlabel}{\string\let\string\nnewlabel\string\newlabel}{}%
      \string\def\string\newlabel \stringhash1{\string\nnewlabel{\languagePartRelated@@\stringhash
        1}}}
    \@ifundefined{no@prefix@hyperref}{\let\no@prefix@hyperref\hyperref}{}%
    \def\hyperref[##1]##2{\no@prefix@hyperref[\languagePartRelated@@##1]{##2}}%
  %  \@ifundefined{no@prefix@subref}{\let\no@prefix@subref\subref}{}%
  %  \def\subref##1{\no@prefix@subref{#1-##1}}%
    \@ifundefined{no@prefix@ref}{\let\no@prefix@ref\ref}{}%
    \def\ref##1{\no@prefix@ref{\languagePartRelated@@##1}}%
    \@ifundefined{no@prefix@autoref}{\let\no@prefix@autoref\autoref}{}%
    \def\autoref##1{\no@prefix@autoref{\languagePartRelated@@##1}}%
    \def\Altref##1##2{{\hyperref[##2]{##1~{\upshape\no@prefix@ref*{\languagePartRelated@@##2}}}}}%
  }{%
    \def\Altref##1##2{{\hyperref[##2]{##1}~{\upshape\ref{##2}}}}}%
  \let\longref\Altref
  \ifx\russian@lang\article@lang\make@title@pages{#1}{english}\else\make@title@pages{#1}{russian}\fi}%
\def\title@bookmark #1\subtitle #2\relax{\pdfbookmark[0]{#1}{\languagePartRelated@@ maketitle}}%
\def\killextrapage{\clearpage \let \@outputpage\relax}
\newif \ifHugeTitlepage
\def\make@title@pages#1#2{%
  \NamedLanguagePage{maketitle}%
  \let\volinfo\empty\setcounter{citeCount}{0}%
  \def\altpsta@sandbox{#2-\@ifundefined{article@id}{}{\@article@id }}%
  \e@a@Tlc\ifnum{author.current}>1
    \global\let\authorsmark\authorsmark@%\wlog{authorsmarks on!}
  \else
    \global\let\authorsmark\@gobble%\wlog{authorsmarks off}
  \fi
  \thispagestyle{firstpage}% this sets first page specifications
    \normaltopskip0pc\relax
    \topskip0pc\relax
  \let\par\@@par
  \topskip\z@
  \let\and\commaSpace
  \setbox\@tempboxa\vbox{{\ifHugeTitlepage\tiny\else\scriptsize\fi
    \noindent$\copyright$ {\hyperlink{\@ifundefined{#1-\@article@id authorsinfo@page}{#2}{#1}-\@article@id authorsinfo}{\@nameuse{\languagePartRelated@@ authors.FIO}}}%
    \hskip2ptplus80cm\copyrightYear \hskip0ptplus280cm
    \hbox{\relax}\hskip 2mmplus3cm$\vcenter
      {\hbox{\csname journallicense\endcsname}}$\parfillskip\z@ \par
    \medskip
    \noindent{\footnotesize\textsf{%
      \@ifundefined{pstaotherpages}{}{%
        \href{\JournalURL read/psta\Year\string_\Issue
          \string_\pstaotherpages.pdf}{%
            \textsf{\linktootherlanguagepaper:}\hskip 2mmplus7cm
            \textit{\JournalURL read/psta\Year\string_\Issue
            \string_\pstaotherpages.pdf}}}}\parfillskip\z@\par}%
    }}%
    \enlargethispage
    {\dimexpr-\ht\@tempboxa-\dp\@tempboxa-1pc\relax}%
  \pstamarkboth{\hyperlink{\@ifundefined{#1-\@article@id authorsinfo@page}{#2}{#1}-\@article@id authorsinfo}{\@nameuse{#1-\@article@id headlineauthors}}}%
    {{\hyperlink{\languagePartRelated@@ abstract}{\@nameuse{\languagePartRelated@@ shorttitle}}}}%
  \wlog{{hyperlink{\@ifundefined{#1-\@article@id authorsinfo@page}{#2}{#1}-\@article@id authorsinfo}{}}%
    {{hyperlink{\languagePartRelated@@ abstract}{}}}}%
  \begingroup
   \let\@makefnmark\relax  \let\@thefnmark\relax
   \if y\psta@blind \else\vbox to \z@{\vss  \unvbox\@tempboxa \vskip-\vsize}\fi
   \vskip-5mm
   \hbox to\hsize{\tiny
       \scalebox{0.9}{\textit\ArticleType@} \hfill{ }%
        \scalebox{0.85}{\hbox{\textsc{\JournalRubric@}}}}%
   \c@footnote\z@
   \e@a@Tlc\ifx{headlineauthors}\relax\def\pstaleftline{\pstarightline}\fi
   \normalfont\ifHugeTitlepage\scriptsize\else\small\fi
    \csname makecrossmark\endcsname
   \@ifundefined{setsubjclassUDC}{\bigskip}{\noindent\@nameuse{setsubjclassUDC}}%
     {\noindent\tiny\@ifundefined{doi@link}{}{\doi@link{\pagerange}}\par}%
     \psta@ajust@vskips
   \ifHugeTitlepage\else\vskip \bigsoftskipamount\fi
   \vskip \bigsoftskipamount
   {\ifHugeTitlepage\fontsize{10}{11\p@}\else\fontsize{11}{12\p@}\fi\selectfont\relax
   \centering
     \def\\{\protect\linebreak}%
     \languagePartRelated@\@ifundefined{title}{}{\intitletrue
        \ifHugeTitlepage\else\Large\fi\bfseries
       {\@nameuse{\languagePartRelated@@ title}}}\par}\intitlefalse
  {\expandafter\expandafter\expandafter\title@bookmark
  \csname \languagePartRelated@@ title\endcsname\subtitle\relax}%
   \vskip \ifHugeTitlepage\smallerskipamount\else\bigsoftskipamount\fi
   {\hbox to\hsize{\hss\@nameuse{\languagePartRelated@@ dedication}}\@@par}
   \vskip \ifHugeTitlepage\smallerskipamount\else\bigsoftskipamount\fi
   \if y\psta@blind \HideFromPeer@{\pstahiddenauthorsname}\par\medskip\else
     {\parindent\z@
       \check@author@attribute{thanks}%
       \check@author@attribute{address}%
       \check@author@attribute@{author.current}%
       \let\author@format\author@format@intitle\let\author@join\author@join@intitle
       \@nameuse{\languagePartRelated@@ author.list}{}%
       \rightskip=\z@ plus1fill
       \tiny\sffamily\selectfont
       \par\smallskip
       \parindent=\z@
       \@nameshow {Num-of-common-#1-addresses}
       \@nameshow{\languagePartRelated@@ address.current}
       \list@address@or@thanks{address}%
        \par
       \rmfamily\itshape
       \leftskip\z@
       \@nameuse{correspondent-\@email.list}%
%        \hskip 1ptplus5cm\parfillskip\z@\rightskip \z@
%        \tiny$($\textit{%
%        \@ifundefined{#1-authorsinfo@page}{%
%          \@ifundefined{#2-authorsinfo@page}{}{%
%             \more@info@inAltLang\hyperlink
%               {#2-authorsinfo}{\@nameuse{#2-authorsinfo@page}}}}{%
%          \moreonthis@\hyperlink
%               {#1-authorsinfo}{\@nameuse{#1-authorsinfo@page}}}}$)$
    \@@par}\fi
   \ifHugeTitlepage\else\vskip \bigsoftskipamount\fi
   \vskip \bigsoftskipamount
   \textsf{\relax\h@link@ref{\altpsta@sandbox abstract}{\abstractname}{\abstractname}. }%
   \label{abstract}%
   {\parindent 1em
     \expandafter\hypertarget
     \expandafter{\languagePartRelated@@ abstract}{\@nameuse{\languagePartRelated@@ abstract}}%
     \if y\psta@blind\else
     \@ifundefined{#1-\@article@id thebibliography@page}{}{%
        \ifnum\numexpr\@nameuse{#1-\@article@id thebibliography@page}-\@nameuse{#1-\@article@id maketitle@page}\relax<3
           {(\emph{\inotherlanguagename}).}\else
        \@ifundefined{#2-\@article@id thebibliography@page}{\IfFileExists{data/review.txt}{}{\textcolor{red}{(\emph{\abspartname})}}}{%
          \ifnum\numexpr\@nameuse{#2-\@article@id thebibliography@page}-\@nameuse{#2-\@article@id maketitle@page}\relax>3
            \ifnum\numexpr\@nameuse{#1-\@article@id thebibliography@page}\relax
              >\numexpr\@nameuse{#2-\@article@id thebibliography@page}\relax (\emph{\csname abs#2#1name\endcsname})\else
              (\emph{\csname abs#1#2name\endcsname})\fi
            \ifx\languagename\russian@lang\else.\fi\fi}\fi}\fi\par}%
  %\@ifundefined{pstaotherpages}%
   %{\ \expandafter\ifx\csname #1@lang\endcsname\article@lang{\footnotesize
   %  {\hyperlink{#2.abstract}{\hskip\z@ plus\hsize
   %\linebreak[1]\strut\hskip\z@ plus\hsize
   %$($\textit{\foreignlanguage{#2}{\linktootherlanguageabstract}~\pageref{#2.abstract}}$)$}%
   %  \parfillskip\z@\par
   %      }}{}\else\hyperlink{#2.abstract}{(\emph
   %        {\inotherlanguagename}).}\fi\par}{\par}}%
  \medskip
  \textsf{\keywordsname:\enspace}{\@nameuse{\languagePartRelated@@ keywords}}\@@par
  \RussianEnglish{}{%
    \@ifundefined{setsubjclass2020}{%
      \@ifundefined{setsubjclass2010}{}{\medskip\@nameuse{setsubjclass2010}}%
      }{\medskip\@nameuse{setsubjclass2020}}}\@@par
  \if y\psta@blind  \@ifundefined{@Reviewer}{}{\noindent\@Reviewer. }%
  \else
    \medskip
    {\languagePartRelated@\@ifundefined{thanks.list}{}{%
      \textsf{\PSTAacknowledgments: }\list@address@or@thanks{thanks}}%
    \let\PrintURL@\PrintURL\let\PrintDOI@\PrintURL
    \let \IsAmsBibKeys\@firstofone
    \par
    }\vskip \bigsoftskipamount
    \let\virtualpunct.
    \textsf{\SSylkaa}:
      {\let\virtualpunct\@empty\spaceskip2ptplus4pt
      \languagePartRelated@\@ifundefined{\RussianEnglish{authors.FIO}{authors.firstNameOF}}{}{%
        \languagePartRelated@\@ifundefined{authorsinfo@page}{}{\hyperlink{ \languagePartRelated@\@ifundefined
          {authorsinfo@page}{\authorsinfo@languagename}{\languagename}-\@article@id authorsinfo}}%
        {\RussianEnglish{\@nameuse{\languagePartRelated@@ authors.FIO}}{\@nameuse{\languagePartRelated@@ authors.firstNameOF}.} }}%
      \textit{\let\\\empty\@nameuse{\languagePartRelated@@ title}}\RussianEnglish{ /\!/}{.} \@ifundefined
          {#1PublicationInfo}{\PublicationInfo}{\@nameuse{#1PublicationInfo}} %
     \@ifundefined{#1-\@article@id thebibliography@page}{}{%
        \ifnum\numexpr\@nameuse{#1-\@article@id thebibliography@page}-\@nameuse{#1-\@article@id maketitle@page}\relax<3
           {(\emph{\inrussname}).}\else
          \@ifundefined{#2-\@article@id thebibliography@page}{}{%
            \ifnum\numexpr\@nameuse{#2-\@article@id thebibliography@page}-\@nameuse{#2-\@article@id maketitle@page}\relax>3
              \wlog{#1#2name=\csname#1#2name\endcsname}%
              \ifnum\numexpr\@nameuse{#1-\@article@id thebibliography@page}\relax
                >\numexpr\@nameuse{#2-\@article@id thebibliography@page}\relax (\emph{\csname#2#1name\endcsname})\ifx\languagename\russian@lang\else.\fi\else
                (\emph{\csname#1#2name\endcsname}).\fi\fi}\fi} { }
      \penalty0\PublicationLink{\pagerange\urlSuffix}}%
    \rightskip \z@ \parfillskip \z@ plus2\hsize\@@par\medskip\pagebreak[4]
  \fi
  \endgroup
  \if\psta@blind y\hugeskip\pagebreak\fi}%
\def\@makefnmark{\leavevmode \raise .9ex\hbox {{\kern 0.5pt \tiny\upshape\textcolor[rgb]{0.1,0.3,0}{\textsf{\@thefnmark}}}}}%
\def\@makefntext{\indent \llap{\@makefnmark}\kern 1pt }%
\newif\iftransbibliography
\def\maybespace{\hskip1ptplus.5\hsize\strut\penalty-2000}%
\def\h@link@ref#1#2#3{\@ifundefined{pstaotherpages}{\hyperlink{#1}{#2}}{%
    %\href{\JournalURL read/psta\Year\string_\Issue\string_\pstaotherpages.pdf}%
    {#3}}}%
%%% makefinish {{{1
\def\makefinish{%
  \if y\psta@blind \else
    \selectlanguage{\article@lang}%
    \medskip
    {\scriptsize\csname PSTA@history\endcsname}%
    \medskip
    \let\\\space
    \languagePartRelated@\@ifundefined{PSTA@recommended}{}{{%
      \noindent\leavevmode
      {\small\PSTArecommended}\hskip 1emplus500cm
      \textit{\@nameuse{\languagePartRelated@@ PSTA@recommended}}\leftskip0ptplus5cm
      \parfillskip0pt\@@par}}%
    \csname BeforeAuthorsInfos \endcsname
    \makeauthorsinfo
    \vskip0ptplus3cm\fi\pagebreak}%

\def\Appendixes{\let\enddoc@text@@\enddoc@text@\let\enddoc@text@\relax\enddoc@text\let \enddoc@text\enddoc@text@@}%
\def\AuthorImageWidth#1{\gdef\@AuthorImageWidth{#1}}\AuthorImageWidth{30mm}%
\long\def\BeforeAuthorsInfos#1{\expandafter\gdef\csname BeforeAuthorsInfos \endcsname{#1}}%
\def\BeforeEnglishRefs#1{\expandafter\gdef\csname BeforeEnglishRefs \endcsname{#1}}%
\def\BetweenAuthorsInfos#1{\expandafter\gdef\csname BetweenAuthorsInfos \endcsname{#1}}\BetweenAuthorsInfos{\smallskip }%
\def\thebibliographyinEnglishReal{\transbibliographytrue{%
    \csname BeforeEnglishRefs \endcsname }\small \theenglishbibliography}%
\def\PstaFinalSkip#1{\expandafter\gdef\csname PstaFinalSkip \endcsname{#1}}\expandafter\gdef\csname PstaFinalSkip \endcsname{\vskip 0ptplus.5\vsize\break}%
\def\newlineindent{\hfill\break\hbox{\strut\qquad}}%
\def\historyLineFormat#1#2{\hbox to 56mm{\textsl{#1}\hss{\tiny#2}}}%
\def\CRediTs{%
  \ifcase\@nameuse{\languagePartRelated@@ author.current}\or\else
    \languagePartRelated@\@ifundefined{author.1.CRediT}%
      {\emph{\PSTAnoCRediTstext}}%
      {\PSTACRediTstext:
        \let\author@format\author@format@CRediTs
        \let\author@join\relax
        \@nameuse{\languagePartRelated@@ author.list}%
      }. \par\fi
}
\def\ConflictsOfIntersts#1{\l@arg\def{PSTAconflictsofinterests}{#1}}
\def\author@format@CRediTs#1{\ifcase#1\or \else; \fi\emph{\@nameuse{\languagePartRelated@@ author.#1.\RussianEnglish{FIO}{firstNameOF}}}~\--- \@nameuse{\languagePartRelated@@ author.#1.CRediT}}%
\def\@ifoneauthor#1#2{\ifcase\@nameuse{\languagePartRelated@@ author.current}\or#1\else#2\fi}%
\def\makeauthorsinfo{%
        \label{infO}%
        %\microtypecontext{expansion=sloppy}%
         \let\author@format\author@format@info\let\author@join\author@join@info
        %\show\person@body
        \languagePartRelated@\@ifundefined{author.current}{}%
        {%
          \noindent\hypertarget{\languagePartRelated@@ authorsinfo}{\strut}\section*{\@ifoneauthor\oneauthor\manyauthors:}%
            \nobreak
       \@nameuse{\languagePartRelated@@ author.list}%
    \@@par}%
    \NamedLanguagePage{authorsinfo}%
    \medskip
    \CRediTs\nobreak\par
    \emph{\@ifoneauthor\PSTAconflictofinterests\PSTAconflictsofinterests.}\nobreak\@@par}

\def\makepstaQ{%
    \expandafter\ifx\csname psta-Q\endcsname\relax\else
    \bigskip\par%\noindent
    \textbf{{\itshape \PSTAjouQ\/}:}%
    \csname psta-Q\endcsname\fi
    \expandafter\ifx\csname psta-A\endcsname\relax\else
    \par\textbf{{\itshape \PSTAjouA\/}:}%
    \csname psta-A\endcsname \vfill\fi
    \bgroup\expandafter\ifx\csname psta-In\endcsname\relax\else
    \bigskip\small\par\textit{\Postupila}%
    \csname psta-In\endcsname.\fi
    \egroup}%

%\def\short@author#1{\l@nameuse{#1.shortauthor}}%
\def\displaysubtitlemode{\unskip\\[1ptplus1pt] \normalsize \itshape}%
\def\subtitlerelax#1\relax{}%
\newif\ifintitle
\def\subtitle{\futurelet\@lettoken\subtitle@}%
\def\subtitle@{\ifx\@lettoken(\expandafter\subtitle@@@
  \else\expandafter\subtitle@@\fi}
\def\subtitle@@@(#1){\ifintitle\unskip\\[1ptplus1pt] \normalsize \else{ }\fi\itshape$($#1$)$}%
\def\subtitle@@#1{\ifintitle\unskip\\[1ptplus1pt] \normalsize \itshape#1\else\unskip. \MakeTextUppercase{#1}\fi}%
%%
%% 3. Sectioning
%%
\def\section{\@startsection{section}{1}%
  \normalparindent{\bigskipamount}{\smallskipamount}%
  {\normalfont\sffamily\bfseries\raggedright}}%
\def\subsection{\@startsection{subsection}{2}%
  \normalparindent{\biggerskipamount}{\smallskipamount}%%
  {\normalfont\sffamily\bfseries\raggedright}}%
\def\subsubsection{\@startsection{subsubsection}{3}%
  \normalparindent{\medskipamount}{\smallskipamount}%%
  {\normalfont\sffamily\itshape\raggedright}}%
\def\paragraph{\@startsection{paragraph}{4}%
  \normalparindent{\smallerskipamount}{\parskip}%%
  {\normalfont\sffamily\raggedright}}%
\def\subparagraph{\@startsection{subparagraph}{5}%
  \z@{2\psta@v@pt}{-\fontdimen2\font\raggedright}%
  {\normalfont\sffamily}}%
\def\@makechapterhead#1{\global\topskip 7.5pc\relax
  \begingroup
  \fontsize{\@xivpt}{18}\sffamily\bfseries\raggedright
    \ifnum\c@secnumdepth>\m@ne
      \leavevmode \hskip-\leftskip
      \rlap{\vbox to\z@{\vss
          \hbox{\hskip\normalparindent\normalsize\sffamily\mdseries
              \MakeTextUppercase\@xp{\chaptername}\enspace\thechapter}%
          \vskip 3pc}}\hskip\leftskip\fi
     \hskip\normalparindent#1\par \endgroup
  \skip@34\p@ \advance\skip@-\normalbaselineskip
  \vskip\skip@ }%
\def\@makeschapterhead#1{\global\topskip 7.5pc\relax
  \begingroup
  \fontsize{\@xivpt}{18}\sffamily\bfseries\raggedright
  #1\par \endgroup
  \skip@34\p@ \advance\skip@-\normalbaselineskip
  \vskip\skip@ }%
\def\appendix{\par
  \c@chapter\z@ \c@section\z@
  \let\chaptername\appendixname
  \def\thechapter{\@Alph\c@chapter}}%
%%
%% 3. Lists
%%
\def\@listI{\leftmargin\leftmargini \parsep\z@skip
  \topsep\listisep \itemsep\z@skip
  \listparindent\normalparindent}%
\let\@listi\@listI
\def\@listii{\leftmargin\leftmarginii
  \labelwidth\leftmarginii \advance\labelwidth-\labelsep
  \topsep\z@skip \parsep\z@skip \partopsep\z@skip \itemsep\z@skip}%
\def\@listiii{\leftmargin\leftmarginiii
  \labelwidth\leftmarginiii \advance\labelwidth-\labelsep}%
\def\@listiv{\leftmargin\leftmarginiv
  \labelwidth\leftmarginiv \advance\labelwidth-\labelsep}%
\def\@listv{\leftmargin\leftmarginv
  \labelwidth\leftmarginv \advance\labelwidth-\labelsep}%
\def\@listvi{\leftmargin\leftmarginvi
  \labelwidth\leftmarginvi \advance\labelwidth-\labelsep}%
\newskip\listisep
\listisep\smallskipamount
\def\@listIZ{\leftmargin18pt \parsep=.5\smallskipamount
  \topsep2\parsep \itemsep\z@skip  \listparindent\normalparindent}%
\AtBeginDocument{\leftmargini=0.5\parindent
  \leftmarginii=0.6667\parindent
  \leftmarginiii=1.3333\parindent
  \def\refenumi#1{\scalebox{.95}{\hbox{$\textcolor[rgb]{0.7,0.7,0.7}{{\scriptstyle(}}\kern-.5pt\textcolor[rgb]{0.5,0.5,0.5}{\pmb{\mathit{#1}}}\kern-0.5pt{\scriptstyle)}$\kern -.23\parindent}}}%
  \def\labelenumi{\refenumi{\theenumi}}%
  \def\labelitemi{{$\m@th\scriptstyle \bullet$}}}%
\renewenvironment{quotation}{\list{}{%
    \leftmargin\parindent \listparindent\normalparindent
    \itemindent\parindent
    \rightmargin\leftmargin \parsep\z@ \@plus\p@}%
  \item[]%
}{%
  \endlist
}%
\if y\load@fancyvrb\input {psta/verbvert.sty}\fi
\gdef\backref#1{\@ifundefined{\languagePartRelated@@ thebibliography@page}{}{\ifnum\numexpr\@nameuse
    {\languagePartRelated@@ thebibliography@page}-\@nameuse{\languagePartRelated@@ maketitle@page}\relax>2 { }
   \hskip-2ptminus2pt\textcolor{backrefcolor}{$\uparrow${\tiny#1}}\fi}}%
\def\@@itempenalty{\@M \@itempenalty=\saved@itempenalty }%
\def\@@beginparpenalty{\@M \let\@beginparpenalty\saved@beginparpenalty}%
%% AmSbib

\renewenvironment{thebibliography}[1]% Adapted from article.cls and amsbib.sty
  {\section*{\thereferences}%
    % \pstamarkboth{\refname}{\refname}%
    \let\@noitemerr\relax
    \let\savedlanguagename\languagename
    \list{{\languagePartRelated@\@ifundefined{citeNum(\itemarg)}%
            {\otherLanguageRelated@\@ifundefined{citeNum(\itemarg)}%
              {\@biblabel{\redCiteMark{\itemarg}{?}}}%
              {{\tiny\@biblabel{\otherLanguageRelated@\@nameuse{citeNum(\itemarg)}}}}}%
            {\@biblabel{\@nameuse{\languagePartRelated@@ citeNum(\itemarg)}}}}}%
      {\settowidth\labelwidth{[#1]}%
        \leftmargin\labelwidth
        %\wlogThe@\leftmargin
        \advance\leftmargin\labelsep
        %\wlogThe@\leftmargin
        %\let\p@enumi\@empty
        %\renewcommand\theenumi{\@arabic\c@enumi}%
       }%
    %\usecounter{enumi}%
    \def\makelabel##1{\hbox to\labelwidth{\hfil ##1}\hss}%
    \clubpenalty4000
    \@clubpenalty \clubpenalty
    \widowpenalty4000%
    \sfcode`\.\@m
    \def\@bibitem##1{% From hyperref.sty, latex.ltx and backref.sty
      \par%\endbibitem
      \@safe@activestrue
      \@skiphyperreftrue
      \edef\itemarg{##1}% One
      \@ifnextchar [\@item{\@noitemargtrue \@item[\@itemlabel]}
      \@skiphyperreffalse
      \Hy@raisedlink{%
        \hyper@anchorstart{cite.\languagePartRelated@@
           ##1\@extra@b@citeb}\relax\hyper@anchorend
      }%
      \if@filesw
        \begingroup
          \let\protect\noexpand
          \immediate\write\@auxout{%
            \languagePartRelated@{\string\bibcite}{##1}{\languagePartRelated@
               \@ifundefined{citeNum(##1)}%
           {\otherLanguageRelated@\@ifundefined{citeNum(##1)}%
             {\string\redCiteMark{\itemarg}{?}}%
             {\otherLanguageRelated@\@nameuse{citeNum(##1)}}}%
           {\@nameuse{\languagePartRelated@@ citeNum(##1)}}}%
          }%
        \endgroup
      \fi
      \ignorespaces
      \@safe@activesfalse
     }%
%     \def\endbibitem{\let\endbibitem\@endbibitem}%
%     \let\par\betweenItemsPar
    \ifnum\Year>2026\small\fi
    \ifx\english@lang\languagename
      \def\RBibitem{\errmessage{Command \string\RBibitem\space
        is not available in the english bibliography!}\bibitem}\fi
    \ifnum\Year<2026\small
    \else
    %  \ifnum\numexpr\@nameuse{\languagePartRelated@@ maketitle@page}+3>\number\c@page
    %    \footnotesize\fi
    \fi
    \def \allowbreak{\penalty \z@ \hskip 0ptplus2pt}%
    \@itempenalty =50 %
    \sfcode `\.=1000\relax
    \def\newblock{\hskip .11em plus .33em minus .07em}%
    \rightskip 0ptplus1mm\SoftSpaces
    \NamedLanguagePage{thebibliography}}%
  {\nobreak\@@par\let\@noitemerr\empty\endlist}%
\backrefparscanfalse
\def\Bibitem{\par\English\bibitem}%
\def\RBibitem{\par\Russian\bibitem}%
%\def\@endbibitem{\end@@ref\restorePars}%
%\def\ignorePars{\let\par\relax%\let\par\space
%
%\def\betweenItemsPar{\@endbibitem\par}%
%\def\restorePars{\let\par\bibSavedPar}\let\bibSavedPar\par
\newif\if@Ref@
\newif\if@finalpunct@\@finalpunct@true
\newif\if@kern
\newif\ifbook@
\newif\ifbibpaper@
\newif\ifmoreref@
\newif\ifprocpaper@

\def\test@Ref@{\if@Ref@\else\@@Ref\fi}%
\let\@end@thebibliography@hook\par
\def\@@Ref{\ifhmode\unskip\else\leavevmode\fi
  \begingroup
    \@Ref@true\@finalpunct@true
  \def\envir@end{\end@@ref}%
  \let\par\end@@ref
  \global\let\nofrills@list\empty
  \refbreaks %
  \procpaper@false \book@false \moreref@false
  \def\curbox{\z@}\setbox\z@\vbox\bgroup}%

\gdef\@ref{\@kernfalse
    \ifmoreref@ \commaunbox@AB@\translbox@AB@
    \else \@kerntrue
    \fi
    \if@kern\kern-\tw@ sp\kern\m@ne sp\fi \@@ref}%


\def\nofrills{\expandafter
    \ifx\envir@end\end@@ref \let\do\relax
        \xdef\nofrills@list{\nofrills@list\do\curbox}%
    \else\errmessage{\Invalid@@ \string\nofrills}\fi}%

\def\end@ref@{%
        \def\nofrillscheck##1{%
            \def\do####1{\ifx##1####1\let\frills@\@gobble\fi}%
        \let\frills@\@firstofone \nofrills@list}%
    \@ref}%

\def\end@@ref{%
  \makerefbox@AB@ \z@ {\endgraf \egroup }\end@ref@
  \endgraf \endgroup
  \color[rgb]{0,0,0}}%

\def\refbreaks{%
  \let\volinfo\volinfo@AB@
  \let\refconcat\refconcat@AB@
  \let\vadjust\vadjust@AB@
  \let\newpage\newpage@AB@
  \let\newline\newline@AB@
  \let\linebreak\linebreak@AB@
  \def\holdover##1{%
    \RIfM@
      \penalty -\@M\null\hfil$
        \clubpenalty\z@
        \widowpenalty\z@
        \interlinepenalty\z@
        \offinterlineskip\endgraf
        \setbox\z@\lastbox
        \unskip
        \unpenalty
        \refconcat@AB@{##1}%
      \noindent
        $\hfil\penalty -\@M
    \else
      {\parfillskip0pt \endgraf}%
      \refconcat@AB@{##1}%
      \noindent
    \fi}}%
\def\makerefbox@AB@#1#2{%
  \test@Ref@\endgraf
  \setbox\z@\lastbox
  \global\setbox\@ne\hbox
    {\unhbox\holdoverbox
      \ifvoid\z@\else
        \unhbox\z@\unskip\unskip\unpenalty\fi}%
  \egroup
  \setbox\curbox
    \box \ifdim\wd\@ne>\z@ \@ne \else\voidb@x\fi
  \def\curbox{#1}%
  \setbox#1\vbox\bgroup
    \hsize.3\maxdimen \noindent\leftskip0pt
  #2}%
\def\refconcat@AB@#1{%
  \setbox\z@\lastbox
  \setbox\holdoverbox\hbox{%
    \unhbox\holdoverbox
    \unhbox\z@
    \unskip\unskip\unpenalty#1}}%
\def\@finalpunct{\if@finalpunct@.\fi
  \refquotes@\nobreak\CurrentBib\refbreak@AB@@}%
\def\finalpunct{\ifnum\lastkern=\m@ne\unkern\else\if@finalpunct@.\fi\fi
  \refquotes@\refbreak@}
\def\@@finalpunct{\ifnum\lastkern=\m@ne\unkern\fi\refquotes@
    \if@finalpunct@.\fi
    \unhbox\biblinkbox@AB@\CurrentBib\refbreak@AB@@}%
\newbox\holdoverbox
\newbox\translbox@AB@
\def\transl@#1{\unskip\unskip
    \makerefbox@AB@\z@{\endgraf\egroup}%
    \let\savedef@\finalpunct  \let\finalpunct\empty \end@ref@
    \book@false\procpaper@false #1
    \def\punct@##1##2{\unskip\unskip ##2{\@No@Color;}\allowbreak\ }%
    \global\let\nofrills@list\empty%
    \let\finalpunct\savedef@ \moreref@true
    \def\curbox{\translbox@AB@}%
    \setbox\translbox@AB@\vbox\bgroup \hsize\maxdimen \noindent
    \misc@\nofrills}%
\def\@No@Color{\textcolor{black}}%
%
\def\punct@#1{#1}%
\def\commaunbox@AB@#1{\ppunbox@AB@,\space{#1}\empty}%
\def\pnktunbox@AB@#1{\ppunbox@AB@.\space{#1}\empty}%
\def\emptunbox@AB@#1{\ppunbox@AB@\empty\space{#1}\empty}%
\def\ppunbox@AB@#1#2#3#4{\ifvoid#3\else
  \let\prespace@\relax
  \ifnum\lastkern=\m@ne \unkern\let\punct@\@gobble
    \ifnum\lastkern=-\tw@ \unkern\let\prespace@\ignorespaces \fi
  \fi
  \nofrillscheck#3%
  \punct@{#1}\refquotes@\refbreak@AB@@
  \let\punct@\@firstofone
  \prespace@
  \frills@{#2\@gobble}\space
  \unhbox#3\breakcheck
  \frills@{#4\@gobble}{\kern\m@ne sp}\fi}%
\def\nofrills@@#1{\DN@{#1}\ifx\next\nofrills \let\frills@\@gobble
  \expandafter\expandafter\expandafter\next@\expandafter\@gobble
  \else \let\frills@\@firstofone\expandafter\next@\fi}%
\def\nofrillscheck#1{\def\nofrills@{\nofrills@@{#1}}%
  \futurelet\next\nofrills@}%
\def\newpage@AB@{\vadjust{\vfill\break@AB@}}%
\def\break@AB@{\holdover{\penalty -\@M}}%
\def\linebreak@AB@{\holdover{\penalty -\@M}}%
\def\newline@AB@{\holdover{\hfill\penalty -\@M}}%
\def\endline@AB@{\holdover{\hfill\penalty -\@M}}%
\let\vadjust@\vadjust
\def\vadjust@AB@#1{\holdover{\vadjust@{#1}}}%
\def\breakcheck{\edef\refbreak@AB@@{\ifnum\lastpenalty=\z@\else
  \penalty\the\lastpenalty\relax\fi}\unpenalty}%

\gdef\gost@@ref{%
  \ifvoid\publaddrbox@AB@\let \AB@beforepubl v\else\let\AB@beforepubl n\fi
  \ppunbox@AB@\empty\space\misc@box@AB@\empty%
  \ppunbox@AB@\empty\space\bybox@AB@\empty%
  \ifbook@% Case 1: \book etc.
    \ppunbox@AB@{}{ }\bookbox@AB@\empty
    \ppunbox@AB@{,}{ }\bookinfobox@AB@\empty
    \ppunbox@AB@{.}{-- \bibbookVoltext~}\bookvolbox@AB@\empty
    \ppunbox@AB@{:}{ \voltitletext@}\voltitlebox@AB@\empty
    \ppunbox@AB@{,}{ }\procbox@AB@\empty%
    \ppunbox@AB@{}{ (}\procinfobox@AB@)%
    \ppunbox@AB@{,}{ }\serialbox@AB@{}%
    \ppunbox@AB@{.}{-- \bibVoltext~}\volbox@AB@\empty
    \ppunbox@AB@,{ \volinfotext@ }\volinfobox@AB@\empty
    \ppunbox@AB@{.}{-- \bibserIssuetext }\serissuebox@AB@\empty
    \ppunbox@AB@,{ \issueinfotext@ }\issueinfobox@AB@\empty
    \ppunbox@AB@{,}{ }\editionbox@AB@ \empty%
    \ppunbox@AB@{/}{ \bibedtext~}\edbox@AB@ \empty%
    \ppunbox@AB@{/}{ \bibedstext~}\edsbox@AB@ \empty
    \ppunbox@AB@{,}{ }\finalbookinfobox@AB@\empty
    \ppunbox@AB@{.}{-- }\publaddrbox@AB@\empty%
    \ppunbox@AB@{\if v\AB@beforepubl.-- \else :\fi}{ }\publbox@AB@ \empty
    \ppunbox@AB@{;}{ }\publlbox@AB@ \empty
    \ppunbox@AB@{,}{ }\publaddrrbox@AB@{}%
    \ppunbox@AB@{;}{ }\publllbox@AB@ \empty
    \ppunbox@AB@{,}{ }\publaddrrrbox@AB@{}%
    \ppunbox@AB@{.}{-- }\yrbox@AB@{}%
    \ppunbox@AB@{.}{-- }\isbnbox@AB@{}%
    \else
    \ifprocpaper@ % Case 2: \paper ... \inbook
      \ifvoid \byybox@AB@
        \ppunbox@AB@{}{ }\paperbox@AB@{}%
        \ppunbox@AB@{,}{ }\paperinfobox@AB@{}%
        \ppunbox@AB@{ /\!/ }{\inbook@text }\bookbox@AB@\empty
      \else
        \ppunbox@AB@{}{ }\paperbox@AB@{}%
        \ppunbox@AB@{,}{ }\paperinfobox@AB@{}%
        \ppunbox@AB@{ /\!/ }{}\byybox@AB@\empty
        \ppunbox@AB@{}{ }\bookbox@AB@\empty\fi
      \ppunbox@AB@{,}{ }\bookinfobox@AB@\empty
      \ppunbox@AB@{.}{-- \bibbookVoltext~}\bookvolbox@AB@\empty
      \ppunbox@AB@{:}{ \voltitletext@}\voltitlebox@AB@\empty
      \ppunbox@AB@{,}{ }\procbox@AB@\empty%
      \ppunbox@AB@{}{ (}\procinfobox@AB@)%
      \ppunbox@AB@{,}{ }\serialbox@AB@{}%
      \ppunbox@AB@{.}{-- \bibvoltext~}\volbox@AB@\empty
      \ppunbox@AB@,{ \volinfotext@ }\volinfobox@AB@\empty
      \ppunbox@AB@{.}{-- \bibserIssuetext }\serissuebox@AB@\empty
      \ppunbox@AB@,{ \issueinfotext@ }\issueinfobox@AB@\empty
      \ppunbox@AB@{,}{ }\editionbox@AB@ \empty%
      \ppunbox@AB@{,}{ \bibedtext~}\edbox@AB@ \empty%
      \ppunbox@AB@{,}{ \bibedstext~}\edsbox@AB@ \empty
      \ppunbox@AB@{,}{ }\finalbookinfobox@AB@\empty
      \ppunbox@AB@{,}{ }\publaddrbox@AB@\empty%
      \ppunbox@AB@{\if v\AB@beforepubl.-- \else :\fi}{ }\publbox@AB@ \empty
      \ppunbox@AB@{;}{ }\publlbox@AB@ \empty
      \ppunbox@AB@{,}{ }\publaddrrbox@AB@{}%
      \ppunbox@AB@{;}{ }\publllbox@AB@ \empty
      \ppunbox@AB@{,}{ }\publaddrrrbox@AB@{}%
       \ifvoid \monthissuebox@AB@
          \ppunbox@AB@{.}{-- }\yrbox@AB@{}%
        \else
          \ppunbox@AB@{.}{--  }\monthissuebox@AB@\empty
          \ppunbox@AB@{}{ }\yrbox@AB@{}\fi
        \ppunbox@AB@{.}{-- }\isbnbox@AB@{}%
      \ppunbox@AB@{.}{-- \bibPagestext~}\pagesbox@AB@\empty
    \else % Case 3: \paper ... \jour
      \ppunbox@AB@{}{ }\paperbox@AB@{}%
      \ppunbox@AB@{,}{ }\paperinfobox@AB@{}%
      \ppunbox@AB@{,}{ \proc@text@}\procbox@AB@{}%
      \ppunbox@AB@{}{ (}\procinfobox@AB@)%
      \ppunbox@AB@{ /\!/ }{}\jourbox@AB@{}%
        \ifvoid \monthissuebox@AB@
          \ppunbox@AB@{.}{-- }\yrbox@AB@{}%
        \else
          \ppunbox@AB@{.}{-- }\monthissuebox@AB@\empty
          \ppunbox@AB@{}{ }\yrbox@AB@{}\fi
      \ifvoid\volbox@AB@
        \ppunbox@AB@{.}{-- }\yrbox@AB@{}%
        \ppunbox@AB@{,}{ \volinfotext@}\volinfobox@AB@\empty
        \ppunbox@AB@{.}{-- \bibIssuetext}\issuebox@AB@\empty
        \ppunbox@AB@{,}{ \issueinfotext@}\issueinfobox@AB@\empty
      \else
        \ppunbox@AB@{.}{-- \bibVoltext~}\volbox@AB@\empty
        \ppunbox@AB@{,}{ }\volinfobox@AB@\empty
        \ppunbox@AB@{.}{-- \bibIssuetext}\issuebox@AB@\empty
        \ppunbox@AB@{,}{ \issueinfotext@}\issueinfobox@AB@\empty
      \fi
      \ppunbox@AB@{.}{-- \bibPagestext~}\pagesbox@AB@\empty
  \fi \fi
  \ppunbox@AB@{.}{-- \bibpaperidtext~}\paperidbox@AB@\empty
  \ppunbox@AB@\empty{ (}\miscnotebox@AB@)\empty%
  \ppunbox@AB@{.}{-- }\totalpagesbox@AB@{~\bibpagestext}%
  \ppunbox@AB@,{ \elinktext@AB@ }\elinkbox@AB@{}%
  \ppunbox@AB@{,}{ }\arxivbox@AB@{}%
  \ppunbox@AB@{}{ }\doibox@AB@{}%
  \ppunbox@AB@{}{ }\rincbox@AB@{}%
  \ppunbox@AB@{}{ }\URLbox@AB@{}%
  \ppunbox@AB@\empty{ \ (}\langbox@AB@{)}\empty%
  \ppunbox@AB@{.}{-- }\finalinfobox@AB@\empty
  \ppunbox@AB@\empty{ (\withtext}\withbox@AB@)%
  \ppunbox@AB@\empty{ }\@@finalinfobox@AB@\empty
  \finalpunct
}%

\gdef\ams@@ref{%
  \ppunbox@AB@\empty\space\misc@box@AB@\empty%
  \ppunbox@AB@\empty\space\bybox@AB@\empty%
  \ifbook@% Case 1: \book etc.
    \ppunbox@AB@{.}{ }\bookbox@AB@\empty
    \ppunbox@AB@{,}{ }\bookinfobox@AB@\empty
    \ppunbox@AB@{.}{ \bibbookVoltext~}\bookvolbox@AB@\empty
    \ppunbox@AB@{:}{ \voltitletext@}\voltitlebox@AB@\empty
    \ppunbox@AB@{,}{ }\procbox@AB@\empty%
    \ppunbox@AB@{}{ (}\procinfobox@AB@)%
    \ppunbox@AB@{,}{ }\serialbox@AB@{}%
    \ppunbox@AB@{,}{ \bibvoltext~}\volbox@AB@\empty
    \ppunbox@AB@,{ \volinfotext@ }\volinfobox@AB@\empty
    \ppunbox@AB@,{ \bibserissuetext }\serissuebox@AB@\empty
    \ppunbox@AB@,{ \issueinfotext@ }\issueinfobox@AB@\empty
    \ppunbox@AB@{,}{ }\editionbox@AB@ \empty%
    \ppunbox@AB@{,}{ \bibedtext~}\edbox@AB@ \empty%
    \ppunbox@AB@{,}{ \bibedstext~}\edsbox@AB@ \empty
    \ppunbox@AB@{,}{ }\finalbookinfobox@AB@\empty
    \ppunbox@AB@{,}{ }\publbox@AB@ \empty
    \ppunbox@AB@{,}{ }\publaddrbox@AB@{}%
    \ppunbox@AB@{;}{ }\publlbox@AB@ \empty
    \ppunbox@AB@{,}{ }\publaddrrbox@AB@{}%
    \ppunbox@AB@{;}{ }\publllbox@AB@ \empty
    \ppunbox@AB@{,}{ }\publaddrrrbox@AB@{}%
    \ppunbox@AB@,{ }\yrbox@AB@{}%
    \ppunbox@AB@,{ }\isbnbox@AB@{}%
    \else
    \ifprocpaper@ % Case 2: \paper ... \inbook
      \ifvoid \byybox@AB@
        \ppunbox@AB@{.}{ \startquote}\paperbox@AB@{\stopquote}%
        \ppunbox@AB@{,}{ }\paperinfobox@AB@{}%
      \else
        \ppunbox@AB@{,}{ \startquote}\paperbox@AB@{\stopquote}%
        \ppunbox@AB@{,}{ }\paperinfobox@AB@{}%
        \ppunbox@AB@{:}{ \byytext@ }\byybox@AB@\empty\fi
      \ppunbox@AB@{,}{ \inbook@text }\bookbox@AB@\empty
      \ppunbox@AB@{,}{ }\bookinfobox@AB@\empty
      \ppunbox@AB@{.}{ \bibbookVoltext~}\bookvolbox@AB@\empty
      \ppunbox@AB@{:}{ \voltitletext@}\voltitlebox@AB@\empty
      \ppunbox@AB@{,}{ }\procbox@AB@\empty%
      \ppunbox@AB@{}{ (}\procinfobox@AB@)%
      \ppunbox@AB@{,}{ }\serialbox@AB@{}%
      \ppunbox@AB@{,}{ \bibvoltext~}\volbox@AB@\empty
      \ppunbox@AB@,{ \volinfotext@ }\volinfobox@AB@\empty
      \ppunbox@AB@,{ \bibserissuetext }\serissuebox@AB@\empty
      \ppunbox@AB@,{ \issueinfotext@ }\issueinfobox@AB@\empty
      \ppunbox@AB@{,}{ }\editionbox@AB@ \empty%
      \ppunbox@AB@{,}{ \bibedtext~}\edbox@AB@ \empty%
      \ppunbox@AB@{,}{ \bibedstext~}\edsbox@AB@ \empty%
      \ppunbox@AB@{,}{ }\finalbookinfobox@AB@\empty
      \ppunbox@AB@{,}{ }\publbox@AB@ \empty
      \ppunbox@AB@{,}{ }\publaddrbox@AB@{}%
      \ppunbox@AB@{;}{ }\publlbox@AB@ \empty
      \ppunbox@AB@{,}{ }\publaddrrbox@AB@{}%
      \ppunbox@AB@{;}{ }\publllbox@AB@ \empty
      \ppunbox@AB@{,}{ }\publaddrrrbox@AB@{}%
      \ifvoid \monthissuebox@AB@
        \ppunbox@AB@,{ }\yrbox@AB@{}%
      \else
        \ppunbox@AB@,{ }\monthissuebox@AB@\empty
        \ppunbox@AB@{}{ }\yrbox@AB@{}\fi
        \ppunbox@AB@,{ }\isbnbox@AB@{}%
      \ppunbox@AB@{,}{ \bibpagestext~}\pagesbox@AB@\empty
    \else % Case 3: \paper ... \jour
      \ppunbox@AB@{.}{ \startquote}\paperbox@AB@{\stopquote}%
      \ppunbox@AB@{,}{ }\paperinfobox@AB@{}%
      \ppunbox@AB@{,}{ \proc@text@}\procbox@AB@{}%
      \ppunbox@AB@{}{ (}\procinfobox@AB@)%
      \ppunbox@AB@{,}{ }\jourbox@AB@{}%
      \ifvoid\volbox@AB@
        \ppunbox@AB@{,}{ }\yrbox@AB@{}%
        \ppunbox@AB@{,}{ \volinfotext@}\volinfobox@AB@\empty
        \ppunbox@AB@{,}{ \bibissuetext}\issuebox@AB@\empty
        \ppunbox@AB@{,}{ \issueinfotext@}\issueinfobox@AB@\empty
      \else
        \ppunbox@AB@{,}{ }\volbox@AB@\empty
        \ppunbox@AB@{,}{ }\volinfobox@AB@\empty
        \ppunbox@AB@:{}\issuebox@AB@\empty
        \ppunbox@AB@{,}{ \issueinfotext@}\issueinfobox@AB@\empty
        \ifvoid \monthissuebox@AB@
          \ppunbox@AB@{}{ (}\yrbox@AB@{)}%
        \else
          \ppunbox@AB@{}{ (}\monthissuebox@AB@\empty
          \ppunbox@AB@{}{ }\yrbox@AB@{)}\fi \fi
      \ppunbox@AB@,{ \bibpagestext~}\pagesbox@AB@\empty \fi\fi
  \ppunbox@AB@,{ \bibpaperidtext~}\paperidbox@AB@\empty
  \ppunbox@AB@\empty{ (}\miscnotebox@AB@)\empty%
  \ppunbox@AB@\empty{ }\urlbox@AB@)\empty
  \ppunbox@AB@,{ }\totalpagesbox@AB@{~\bibpagestext}%
  \ppunbox@AB@,{ \elinktext@AB@ }\elinkbox@AB@{}%
  \ppunbox@AB@{,}{ }\arxivbox@AB@{}%
  \ppunbox@AB@{}{ }\doibox@AB@{}%
  \ppunbox@AB@{}{ }\rincbox@AB@{}%
  \ppunbox@AB@{}{ }\URLbox@AB@{}%
  \ppunbox@AB@\empty{ \ (}\langbox@AB@{){\global\@finalpunct@true}}\empty%
  \ppunbox@AB@{,}{ }\finalinfobox@AB@\empty
  \ppunbox@AB@\empty{ (\withtext}\withbox@AB@)%
  \ppunbox@AB@\empty{ }\@@finalinfobox@AB@\empty
  \finalpunct
}%xx (in

\def\AB@newcommand#1#2{\expandafter\AB@newcommand@
  \csname#1\expandafter\endcsname\csname#1box@AB@\endcsname{#2}}%
\def\AB@newcommand@#1#2#3{\def#1{\makerefbox@AB@#2{#3}}\newbox#2}%
\font\invis@font=labx1000 at 4.1pt
% keys from amsbib
\AB@newcommand{@@finalinfo}{\global\@finalpunct@true}%
\let\bibID\@gobble
\AB@newcommand{bookinfo}{\aftergroup\procpaper@true\rm}%
\AB@newcommand{bookvol}{\empty}%
\AB@newcommand{book}{\it\aftergroup\book@true}%
\AB@newcommand{byy}{\empty}%
\AB@newcommand{by}{\byfont}%
\let\citnumelib\@gobble
\let\citnumisi\@gobble
\let\citnummsn\@gobble
\let\citnumscopus\@gobble
\let\citnum\@gobble
\AB@newcommand{edition}{\empty}%
\AB@newcommand{ed}{\empty}%
\AB@newcommand{eds}{\empty}%
\AB@newcommand{elink}{\global\@finalpunct@true}%
\AB@newcommand{finalbookinfo}{\empty}%
\AB@newcommand{finalinfo}{\global\@finalpunct@true}%
\AB@newcommand{from}{\empty}%
\def\inbook{\makerefbox@AB@\bookbox@AB@{\it \aftergroup\procpaper@true\aftergroup\book@false}}\let\inbook@text\empty
\AB@newcommand{isbn}{\empty}%
\AB@newcommand{issn}{\empty}%
\AB@newcommand{issueinfo}{\empty}\let\issueinfotext@\empty
\AB@newcommand{issue}{\empty}%
\AB@newcommand{jour}{{\it\aftergroup\jour@true}}%
\let\journalname\@gobble
\AB@newcommand{lang}{\empty}%
\let\main\@gobble
\AB@newcommand{misc@}{\Russian}%
\AB@newcommand{miscnote}{\empty}%
\AB@newcommand{monthissue}{\empty}%
\AB@newcommand{pages}{\global\let\page@text=\bibpagestext}%
\def\page{\global\let\page@text=\bibpagetext\makerefbox@AB@\pagesbox@AB@\empty}%
\AB@newcommand{paperinfo}{\empty}%
\AB@newcommand{paperid}{\empty}%
\def\papernumber{\makerefbox@AB@\paperidbox@AB@\empty}%
\AB@newcommand{paper}{\aftergroup\bibpaper@true\@ifgost\it\empty}%
\AB@newcommand{paperid}{\empty}%
\AB@newcommand{procinfo}{\empty}%
\AB@newcommand{proc}{\empty}%
\let\pstatus\@gobble
\let\ptype\@gobble
\AB@newcommand{publaddrrr}{\empty}%
\AB@newcommand{publaddrr}{\empty}%
\AB@newcommand{publaddr}{\empty}%
\AB@newcommand{publll}{\empty}%
\AB@newcommand{publl}{\empty}%
\AB@newcommand{publ}{\empty}%
\AB@newcommand{serial}{\ifbibpaper@\aftergroup\procpaper@true\aftergroup\book@false\fi\rm}%
\AB@newcommand{serissue}{\empty}%
\AB@newcommand{sortdate}{\empty}%
\AB@newcommand{totalpages}{\global\@finalpunct@false}%
\AB@newcommand{volinfo}{\empty}% command \volinfo conflicts with amsart, amsbook and amsproc \volinfo
\AB@newcommand{voltitle}{\it}%
\AB@newcommand{vol}{\bf}%
\AB@newcommand{with}{\rmfamily}%
\AB@newcommand{yr}{\empty}%
% Added in PSTA.cls
\AB@newcommand{yr}{\empty}%
\let\AB@href\href\def\AB@hreftt#1#2{\AB@href{#1}{\tt #2}}
\def\arxivtext@{arXiv:\,\allowbreak}%
\let\bookvols=\bookvol
\def\byfont{\rm}%
\def\bysame{\by \hbox to3em{\hrulefill}\thinspace\kern\z@}%
\def\continuepunct#1#2#3#4{}%
\def\eds{\ed \gdef\edtext{eds}}%
\def\elinktext@AB@{}%
\def\elinktext@{}%
\def\endquotes{\def\refquotes@{''\let\refquotes@\empty}}%
\let\eprint=\book
\def\eprintinfo{\bookinfo{\aftergroup\book@true\rm \let\href\AB@href}}%
\def\finalpunct{\ifnum\lastkern=\m@ne\unkern\else\if@finalpunct@.\fi\fi
  \refquotes@\refbreak@AB@@}%
\def\isbntext@{ISBN: }%
\def\jour@true{\global\book@false\global\procpaper@false}%
\let\monthissuetext@\empty
\def\moreref{\transl@ \frenchspacing\global\set@english\g@set@fontenc}\let\transl\moreref
\def\morerref{\transl@\frenchspacing\global\set@russian\g@set@fontenc}\let\rtransl\morerref
\def\page{\pages }%
\def\paperidtext@{}%
\let\paperid=\papernumber
\let\preprint=\eprint
\let\preprintinfo=\eprintinfo
\let\proc@text@\empty
\def\raggedref{\par\rightskip 0mmplus7mm\par\rightskip 0mm\par}%
\let\refquotes@\empty
\let\thesis=\preprint
\let\thesisinfo=\preprintinfo
\def\toappear{\miscnote \bibt@appear}%
\let\voltitletext@\empty
\let\byytext@\empty
\def\volinfotext@{}%
\newbox\urlbox@AB@
\let\refbreak@AB@@\empty
%

\def\setIcon@#1#2#3#4{%
  \newbox#1%
  \IfFileExists{psta/#2_logo.#3}%
    {\global\setbox#1=\hbox{\includegraphics#4{psta/#2_logo.#3}}}%
    {\global\setbox#1=\hbox{\NoIcon{#1}}}%
  \@namedef{#2icon}{\copy#1}}%
\def\NoIcon#1{\scalebox{0.7}{\hbox{\textcolor{black}{\textup{#1}}}}}%
\def\DefineIcon#1.#2#3#4#5{%
  \expandafter\setIcon@\csname#1@box\endcsname{#1}{#2#3#4}{#5}}%
%\tracingassigns=3%\tracingmacros=3
\DefineIcon URL.png{[height=1.7ex]}%
\DefineIcon DOI.png{[height=2ex]}%
\DefineIcon RSCI.pdf{[height=1.7ex]}%
\DefineIcon arXiv.png{[height=2ex]}%
\DefineIcon MN.png{[height=1.7ex]}%
\DefineIcon AMS.png{[height=1.7ex]}%
\DefineIcon iD.pdf{[height=1.7ex]}%
%
\catcode 33=4  % !
\catcode 34=13 % "
\def\toOther@#1#2#3#4#5{% \toOther@{#1}{_}{#3}{#4} defines #3
  % to change all #2 to #1 and call #4 for #5 processing
  \def#3##1#2##2##3\@nil{\ifx##2\empty#4##1#5\empty\@nil\else#3##1#1##2##3#5\empty\@nil\fi}}%
\def\urlSpecific#1 {\urlSpecific@#1_\empty\@nil}%
\expandafter\toOther@\expandafter{\string_}{_}{\urlSpecific@}{\urlSpecific@@}{^}%
\expandafter\toOther@\expandafter{\string^}{^}{\urlSpecific@@}{\urlSpecific@@@}{~}%
\expandafter\toOther@\expandafter{\string~}{~}{\urlSpecific@@@}{\urlSpecific@@@@}{"}%
\expandafter\toOther@\expandafter{\string"}{"}{\urlSpecific@@@@}{\urlSpecific@@@@@}{\empty}%
\def\urlSpecific@@@@@#1\empty#2\@nil{#1 }%
\catcode 33=12 %
%
\def\altText#1{\rlap{\textcolor{white}{\invis@font{#1}}}}%
\def\printIcon#1#2#3#4 {\altText{#1 #4}\href{#2#4}{#3}}%
\def\printWithId#1#2#3#4 {\altText{#1}\href{#2#4}{#3\space \footnotesize #4}}%
\def\printNoIcon#1#2#3 {\href{#1#3}{\NoIcon{#2} \footnotesize#3}}%
\tracingnone
% Specific keys for psta
%\tracingal
\AB@newcommand{doi}{\urlSpecific\printIcon{DOI}{https://doi.org/}{\DOIicon}}%
\AB@newcommand{mathscinet}{\printIcon
  {MathSciNet}{https://www.ams.org/mathscinet-getitem?mr=}{\AMSicon}}%
\AB@newcommand{URL}{\urlSpecific\printIcon{URL}{}\URLicon}%
\AB@newcommand{mathnet}{\printIcon{MathNet}{https://mi.mathnet.ru/}{\MNicon}}%
\AB@newcommand{arxiv}{\printWithId{ArXiv}{https://arxiv.org/abs/}{\arXivicon}}%
\AB@newcommand{rinc}{\printIcon{RSCI}{https://elibrary.ru/item.asp?id=}{\RSCIicon}}%
\def\Href#1#2{\href{#1}{\textsl{#2}\raise.3ex\hbox{\URLicon}}}%
\let\elibrary\rinc
\let\elib\rinc
\let\elink\URL\let\Eprint\URL
\let\crossref\doi

\ifx \No\undefined \DeclareRobustCommand{\No}{\ifmmode{\nfss@text{\textnumero}}\else\textnumero\fi}\fi
\if y\hyphenbreaks \g@addto@macro\UrlBreaks{\do-}\fi
\AtBeginDocument{%
  \def\save@labelwidth{%
    \if@filesw
    \immediate\write\@auxout{%
    \string\newlabel{[bibenv:\the\c@bib@env]}{\the\@maxlabelwidth}}%
    \global\let\save@labelwidth\relax\fi}%
    \@ifpackageloaded {subcaption}%
        {\captionsetup[subtable]{labelfont=rm}%
        \captionsetup[sub]{labelfont=rm}%
        \DeclareCaptionLabelFormat{pstac}{{\scriptsize(}\kern-.3pt#2\kern-.3pt\scriptsize)}%
        \captionsetup[subfigure]{justification=centering,singlelinecheck=false,labelformat=pstac}%
        \captionsetup[sub]{justification=centering,singlelinecheck=false,labelformat=pstac}}{}}%
\def\authorid#1{}%
\renewcommand{\topfraction}{0.98} % maximum size of the top area for floats
\renewcommand{\textfraction}{0.03}   % minimum size of the text area, i.e., the area that must not be occupied by floats
\setcounter{topnumber}{3}           % the maximum number of floats on a text (!) page
\setcounter{totalnumber}{3}     % 2 may work better
\renewcommand{\floatpagefraction}{0.97} % minimum part of the page (or column) that need to be occupied by floats to be allowed to form a float page (or column)
\@ifundefined{Year}{\edef\Year{\the\year}}{}%
\@ifundefined{copyrightYear}{\let\copyrightYear\Year}{}%
\ifx\article@lang\russian@lang \selectlanguage{russian}\else\selectlanguage{english}\fi
%
%\errorcontextlines\maxdimen\showboxbreadth\maxdimen\showboxdepth\maxdimen
\def\sfrac#1#2{\mathchoice
{\sdfrac{#1}{#2}}%
{\btfrac{#1}{#2}}%
{\ssfrac{#1}{#2}}%
{\sssfrac{#1}{#2}}}%
\def\bdfrac#1#2{{\raise2pt\hbox{$#1$}\hskip-2pt\Big/\lower2pt \hbox{\hskip-1pt$#2$}}}%
\def\sdfrac#1#2{{\raise2pt\hbox{$#1$}\hskip-2pt\big/\lower2pt \hbox{\hskip-1pt$#2$}}}%
\def\btfrac#1#2{{\raise2pt\hbox{$#1$}\hskip-2pt\big/\lower2pt \hbox{\hskip-1pt$#2$}}}%
\def\stfrac#1#2{{\raise1pt\hbox{$\scriptstyle#1$}\hskip-1pt/\lower1pt \hbox{\hskip-1pt$\scriptstyle#2$}}}%
\def\ssfrac#1#2{{\raise1pt\hbox{$\scriptscriptstyle#1$}\hskip-1pt\scriptstyle/\lower1pt \hbox{\hskip-2pt$\scriptscriptstyle#2$}}}%
\def\sssfrac#1#2{{\left.\raise1pt\hbox{$\scriptscriptstyle#1$}\hskip-.5pt\middle/\lower1pt \hbox{$\scriptscriptstyle#2$}\right.}}
\AtEndDocument{\clearpage\global\let\clearpage\relax}%
\newif\ifLaTeX\LaTeXtrue
\newif\ifMathML
\def\killextrapage{\clearpage \let \@outputpage\relax}

\newcounter{citeCount}%
\def\@ifrelax#1{\expandafter\ifx\csname#1\endcsname\relax
  \expandafter\@firstoftwo\else\expandafter\@secondoftwo\fi}%

\def\myorg@citex[#1]#2{\leavevmode
  \edef\bbl@tempa{#2}%
  \ifx\bbl@tempa\empty\else
  \let\bbl@tempb\bbl@tempa
  %\wlogToken\bbl@tempa
  \let\numberedBiblinks\empty
  \@cite{\expandafter
    \numberBiblinks\bbl@tempa,{}\expandafter
    \numberBiblinks@\bbl@tempa,{}%
    %\wlogToken\numberedBiblinks
    \expandafter\formatBiblinks\numberedBiblinks 0{}%
  \empty}{#1}%
  \fi}%

\def\numberBiblinks#1,#2{%
  %\wlog{numberBiblinks\space#1,#2}%
  \let\numberedBiblinks\empty
  \@ifempty{#1}{}%
    {\ifcsname\languagePartRelated@@ citeNum(#1)\endcsname\else
      \global\advance \c@citeCount \@ne
      \@namexdef{\languagePartRelated@@ citeNum(#1)}{\the\c@citeCount}%
      %\@nameWlog{\languagePartRelated@@ citeNum(#1)}%
    \fi}%
  \@ifempty{#2}{}%
   {\numberBiblinks#2}}%

\def\numberBiblinks@#1,#2{%
  %\wlog{numberBiblinks@#1,#2}%
  \@ifempty{#1}{}%
  {\edef\numberedBiblinks{\numberedBiblinks
    {\@nameuse{\languagePartRelated@@ citeNum(#1)}}%
      {#1}}%
  \@ifempty{#2}{}{\numberBiblinks@#2}}}%

\def\formatBiblinks#1{\formatBiblinks@{-1}{-1}{-1}{#1}}%
\def\formatBiblinks@#1#2#3#4#5#6{%
  %\wlog{formatBiblinks@{#1}{#2}{#3}{#4}{#5}{#6}}%
  \ifnum #4=0 \expandafter\@firstoftwo\else\expandafter\@secondoftwo\fi
    {}%
    {\ifnum\numexpr#3+1\relax=#4%
       \ifnum\numexpr#4+1\relax=#6%
       \else
         \ifnum\numexpr#2+1\relax=#3%
           \citeDash \formatCite{#5}%
         \else
           \citeComma \formatCite{#5}\fi\fi
     \else
          \ifnum #3>0
            \citeComma \fi
          \formatCite{#5}\fi
     \formatBiblinks@{#2}{#3}{#4}{#6}}}%

\def\citeComma{,\penalty\@m\ }
\def\citeDash{--}
\def\redCiteMark#1#2{%
  \vtop{\offinterlineskip\hbox{\strut\textsuperscript{\textcolor{red}{#2}}}%
      \hbox{\rlap{\kern -4pt\tiny\texttt{\detokenize{#1}}}}\vss}}%
\def\formatCite#1{%
% \tracingall
\languagePartRelated@\Hy@backout{#1}%
% \tracingnone
% \wlog {\string\formatCite{#1}(=\@nameuse{\languagePartRelated@@ citeNum(#1)})}%
  \@ifundefined{b@\languagePartRelated@@#1\@extra@b@citeb}%
    {\redCiteMark{#1}{\@nameuse{\languagePartRelated@@ citeNum(#1)}}}%
    {\@cite@ofmt {\csname b@\languagePartRelated@@#1\@extra@b@citeb\endcsname}}}%
\AtBeginDocument{\global\let\@citex\myorg@citex}%
%\def\lPR{\languagePartRelated@@}
\endinput
% vim:ts=2:shiftwidth=2:expandtab:syn=tex:iskeyword=@,48-58,95,128-255,@-@:
