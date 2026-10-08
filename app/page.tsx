'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronRight, Plus, MonitorPlay, Download, Smartphone, Users } from 'lucide-react';
import Image from 'next/image';

// --- TYPES ---
type ProjectItem = {
  id: number;
  title: string;
  image: string;
};

type ReasonItem = {
  title: string;
  desc: string;
  icon: React.ReactNode;
};

type FAQItem = {
  q: string;
  a: string;
};

// --- MOCK DATA ---
const TRENDING_PROJECTS: ProjectItem[] = [
  { id: 1, title: "Nước Sạch", image: "https://images.unsplash.com/photo-1517400508447-f8dd518b86db?q=80&w=600&auto=format&fit=crop" },
  { id: 2, title: "Rừng Ngập Mặn", image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=600&auto=format&fit=crop" },
  { id: 3, title: "Nuôi Em", image: "https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=600&auto=format&fit=crop" },
  { id: 4, title: "Giải Cứu Tê Tê", image: "https://images.unsplash.com/photo-1620050013531-8974a4413eec?q=80&w=600&auto=format&fit=crop" },
  { id: 5, title: "Thư Viện", image: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?q=80&w=600&auto=format&fit=crop" },
  { id: 6, title: "Giảm Rác Nhựa", image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=600&auto=format&fit=crop" },
];

const REASONS: ReasonItem[] = [
  {
    title: "Theo dõi trên mọi thiết bị",
    desc: "Cập nhật tiến độ dự án trên điện thoại, máy tính bảng, laptop và TV.",
    icon: <MonitorPlay size={48} className="text-pink-500 opacity-80" />
  },
  {
    title: "Tải báo cáo ngoại tuyến",
    desc: "Lưu lại các ấn phẩm và báo cáo tác động để đọc bất cứ lúc nào.",
    icon: <Download size={48} className="text-purple-500 opacity-80" />
  },
  {
    title: "Minh bạch mọi nơi",
    desc: "Số liệu được cập nhật theo thời gian thực từ các tổ chức uy tín.",
    icon: <Smartphone size={48} className="text-blue-500 opacity-80" />
  },
  {
    title: "Hồ sơ cho tình nguyện viên",
    desc: "Tạo không gian riêng biệt để quản lý giờ thiện nguyện của bạn.",
    icon: <Users size={48} className="text-orange-500 opacity-80" />
  }
];

const FAQS: FAQItem[] = [
  { q: "HubApp là gì?", a: "HubApp là nền tảng tổng hợp và theo dõi các dự án xã hội từ các tổ chức NGO, CSO và doanh nghiệp xã hội, giúp bạn dễ dàng đóng góp và theo dõi tác động." },
  { q: "Chi phí tham gia là bao nhiêu?", a: "HubApp hoàn toàn miễn phí cho người dùng theo dõi. Các quỹ đóng góp sẽ được chuyển trực tiếp 100% đến các tổ chức." },
  { q: "Tôi có thể theo dõi ở đâu?", a: "Bạn có thể đăng nhập bằng tài khoản email và theo dõi mọi dự án trên nền tảng web mọi lúc, mọi nơi." },
  { q: "Làm thế nào để hủy đăng ký dự án?", a: "Bạn có thể dễ dàng hủy nhận thông báo hoặc rút khỏi dự án chỉ với hai cú nhấp chuột trong bảng điều khiển cá nhân." },
  { q: "Tôi có thể xem gì trên HubApp?", a: "Các video tài liệu, báo cáo hình ảnh, cập nhật ngân sách và các câu chuyện truyền cảm hứng từ thực địa." },
];

// --- MAIN PAGE ---
export default function Homepage() {
  const [emblaRef] = useEmblaCarousel({ dragFree: true, containScroll: "trimSnaps" });
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  return (
    <main className="min-h-screen bg-black text-white font-sans selection:bg-red-600 selection:text-white pb-24">
      
      {/* 1. HERO SECTION (Căn giữa) */}
      <section className="relative h-[85vh] w-full flex flex-col items-center justify-center text-center px-4 md:px-12 border-b-8 border-[#232323]">
        {/* Background & Overlays */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <Image 
            src="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2500&auto=format&fit=crop"
            alt="Hero Background" 
            fill
            priority
            className="object-cover opacity-40 scale-105"
          />
          {/* Gradient Overlay tối màu làm nổi chữ */}
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/60" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto mt-10">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[2.5rem] md:text-[4rem] font-black leading-[1.1] mb-4 tracking-tight"
          >
            Khám phá: Dự án xã hội tiếp theo bạn sẽ đồng hành
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-lg md:text-2xl font-medium mb-6"
          >
            Theo dõi và ủng hộ các tổ chức. Bất cứ lúc nào.
          </motion.p>
          <motion.p 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="text-base md:text-xl font-normal mb-4"
          >
            Bạn đã sẵn sàng? Nhập email để tạo hoặc kích hoạt tư cách thành viên.
          </motion.p>
          
          {/* Email Form */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto w-full mt-4"
          >
            <div className="relative flex-1">
              <input 
                type="email" 
                placeholder="Địa chỉ Email" 
                className="w-full h-14 bg-black/60 border border-neutral-500 rounded px-4 text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-white focus:bg-black/80 transition-all"
              />
            </div>
            <button className="h-14 px-8 bg-[#E50914] hover:bg-[#C11119] text-white text-xl font-bold rounded flex items-center justify-center gap-2 transition-colors whitespace-nowrap">
              Bắt đầu <ChevronRight size={24} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* 2. TRENDING NOW SECTION (Số to đè lên ảnh) */}
      <section className="relative z-20 py-16 px-8 md:px-24 xl:px-36">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Đang thịnh hành</h2>
        
        {/* Embla Container */}
        {/* Thêm padding-left/right để chừa không gian cho hiệu ứng số to không bị cắt */}
        <div className="overflow-visible pl-4" ref={emblaRef}>
          <div className="flex gap-10 md:gap-14 py-4">
            {TRENDING_PROJECTS.map((project, index) => (
              <motion.div 
                key={project.id}
                className="relative flex-[0_0_45%] sm:flex-[0_0_30%] md:flex-[0_0_20%] lg:flex-[0_0_16%] cursor-pointer group"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "tween", duration: 0.3 }}
              >
                {/* Ảnh Dọc (Aspect Ratio 2/3 hoặc 3/4) */}
                <div className="relative w-full aspect-[2/3] rounded-md overflow-hidden z-10 shadow-xl">
                  <Image 
                    src={project.image} 
                    alt={project.title}
                    fill
                    sizes="(max-width: 768px) 45vw, 20vw"
                    className="object-cover"
                  />
                  {/* Overlay đen nhạt khi có logo N góc trên */}
                  <div className="absolute top-2 left-2 z-20">
                    <span className="text-red-600 font-black text-xl drop-shadow-md">N</span>
                  </div>
                </div>

                {/* Số khổng lồ viền trắng, ruột đen, đặt thụt sang trái (Negative left) */}
                <span className="absolute -left-6 md:-left-8 -bottom-4 md:-bottom-6 text-[100px] md:text-[140px] font-black text-black leading-none z-20 pointer-events-none drop-shadow-2xl [-webkit-text-stroke:3px_white] md:[-webkit-text-stroke:4px_white]">
                  {index + 1}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. MORE REASONS TO JOIN SECTION (Grid thẻ nền Gradient) */}
      <section className="py-12 px-8 md:px-24 xl:px-36">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Thêm lý do để tham gia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {REASONS.map((reason, index) => (
            <div 
              key={index} 
              className="relative bg-gradient-to-br from-[#192145] to-[#140b24] rounded-2xl p-6 min-h-[220px] transition-transform hover:-translate-y-2 cursor-pointer shadow-lg border border-white/5"
            >
              <h3 className="text-xl md:text-2xl font-bold mb-4 text-white pr-4">{reason.title}</h3>
              <p className="text-neutral-400 text-sm md:text-base leading-relaxed">{reason.desc}</p>
              
              {/* Icon góc dưới bên phải */}
              <div className="absolute bottom-6 right-6">
                {reason.icon}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4. FAQ SECTION (Accordion) */}
      <section className="py-16 px-4 md:px-24 xl:px-36 max-w-6xl mx-auto w-full">
        <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center md:text-left">Câu hỏi thường gặp</h2>
        
        <div className="flex flex-col gap-2">
          {FAQS.map((faq, index) => (
            <div key={index} className="flex flex-col">
              <button 
                onClick={() => toggleFAQ(index)}
                className="w-full bg-[#2d2d2d] hover:bg-[#414141] transition-colors p-6 text-left flex justify-between items-center text-lg md:text-2xl font-medium focus:outline-none"
              >
                {faq.q}
                <motion.div
                  animate={{ rotate: openFAQ === index ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Plus size={36} className="text-white" />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {openFAQ === index && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden bg-[#2d2d2d] mt-[2px]"
                  >
                    <div className="p-6 text-lg md:text-2xl font-normal text-neutral-200">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Email Form lặp lại ở dưới cùng */}
        <div className="mt-12 text-center">
          <p className="text-base md:text-xl font-normal mb-4">
            Bạn đã sẵn sàng? Nhập email để tạo hoặc kích hoạt tư cách thành viên.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto w-full">
            <input 
              type="email" 
              placeholder="Địa chỉ Email" 
              className="flex-1 h-14 bg-black/60 border border-neutral-500 rounded px-4 text-white focus:outline-none focus:ring-2 focus:ring-white transition-all"
            />
            <button className="h-14 px-8 bg-[#E50914] hover:bg-[#C11119] text-white text-xl font-bold rounded flex items-center justify-center gap-2 transition-colors whitespace-nowrap">
              Bắt đầu <ChevronRight size={24} />
            </button>
          </div>
        </div>
      </section>

    </main>
  );
}