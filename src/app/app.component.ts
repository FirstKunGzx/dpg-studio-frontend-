import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth/auth.service'; 

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html', 
  styleUrls: ['./app.css'] 
})
export class AppComponent implements OnInit {
  projects: any[] = [];
  
  // 🌟 เพิ่ม location เข้าไปในค่าเริ่มต้น
  newProject: any = { title: '', description: '', imageUrl: '', videoUrl: '', documentUrl: '', categoryId: null, authorName: '', location: '' };
  
  unifiedMediaUrl: string = ''; 
  additionalImages: string[] = []; // 🌟 เก็บรูปภาพ Gallery เพิ่มเติม
  
  showForm: boolean = false; 
  isEditMode: boolean = false;
  editingId: number | null = null;
  
  showDetail: boolean = false;
  selectedProject: any = null;
  currentSlideIndex: number = 0; // 🌟 ควบคุมรูปที่แสดงใน Slider
  selectedCategoryId: string = 'all';
  
  searchKeyword: string = '';
  sortBy: string = 'newest';
  
  myOwnedProjects: number[] = []; 
  isDarkMode: boolean = false;

  // 🌟 ตัวแปรสำหรับระบบ Login
  showLoginModal: boolean = false;
  loginData = { username: '', password: '' };

  // 🌟 เพิ่มตัวแปรสำหรับระบบ Register
  isRegisterMode: boolean = false; // false = หน้า Login, true = หน้า Register
  registerData = { username: '', password: '', role: 'CREATOR' }; // สิทธิ์เริ่มต้นเป็น CREATOR (ตรงกับที่เช็คใน Backend)

  // 🌟 ตัวแปรสำหรับ Admin Dashboard
  showAdminDashboard: boolean = false;
  usersList: any[] = [];

  constructor(
    private http: HttpClient, 
    private cdr: ChangeDetectorRef,
    public authService: AuthService 
  ) {}

  ngOnInit() {
    this.fetchProjects();
    const stored = localStorage.getItem('my_owned_projects');
    if (stored) {
      this.myOwnedProjects = JSON.parse(stored);
    }

    const savedTheme = localStorage.getItem('dpg_theme');
    if (savedTheme === 'dark') {
      this.isDarkMode = true;
    }
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    if (this.isDarkMode) {
      localStorage.setItem('dpg_theme', 'dark');
    } else {
      localStorage.setItem('dpg_theme', 'light');
    }
  }

  fetchProjects() {
    this.http.get<any[]>('https://dpg-studio-backend.onrender.com/project').subscribe((data) => {
      this.projects = [...data]; 
      this.cdr.detectChanges();
    });
  }

  get uniqueCategories() {
    const cats = this.projects.map(p => p.category).filter(c => c != null);
    return cats.filter((v, i, a) => a.findIndex(t => (t.id === v.id)) === i);
  }

  getProjectCountByCategory(categoryId: number): number {
    return this.projects.filter(p => p.categoryId === categoryId).length;
  }

  get filteredProjects() {
    let result = [...this.projects];

    if (this.selectedCategoryId !== 'all') {
      result = result.filter(p => p.categoryId === Number(this.selectedCategoryId));
    }

    if (this.searchKeyword && this.searchKeyword.trim() !== '') {
      const keyword = this.searchKeyword.toLowerCase().trim();
      result = result.filter(p => 
        (p.title && p.title.toLowerCase().includes(keyword)) ||
        (p.description && p.description.toLowerCase().includes(keyword)) ||
        (p.authorName && p.authorName.toLowerCase().includes(keyword))
      );
    }

    result.sort((a, b) => {
      if (this.sortBy === 'newest') {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      } else if (this.sortBy === 'oldest') {
        return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      } else if (this.sortBy === 'title_asc') {
        return (a.title || '').localeCompare(b.title || '');
      } else if (this.sortBy === 'title_desc') {
        return (b.title || '').localeCompare(a.title || '');
      }
      return 0;
    });

    return result;
  }

  onMediaSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith('video/') && file.size > 30 * 1024 * 1024) { 
        alert('ขนาดวิดีโอใหญ่เกิน 30MB ครับ แนะนำให้อัปโหลดลง YouTube แล้วนำ URL มาแปะแทนนะครับ');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => { 
        this.newProject.imageUrl = '';
        this.newProject.videoUrl = '';
        this.newProject.documentUrl = '';
        this.unifiedMediaUrl = ''; 

        if (file.type.startsWith('image/')) {
          this.newProject.imageUrl = e.target.result;
        } else if (file.type.startsWith('video/')) {
          this.newProject.videoUrl = e.target.result;
          const videoElement = document.createElement('video');
          videoElement.src = e.target.result;
          videoElement.muted = true;
          videoElement.playsInline = true;
          videoElement.currentTime = 1; 
          
          videoElement.onloadeddata = () => {
            const canvas = document.createElement('canvas');
            canvas.width = videoElement.videoWidth || 640;
            canvas.height = videoElement.videoHeight || 360;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
              this.newProject.imageUrl = canvas.toDataURL('image/jpeg');
              this.cdr.detectChanges();
            }
          };
        } else {
          this.newProject.documentUrl = e.target.result; 
          this.newProject.imageUrl = 'https://placehold.co/600x400/eff6ff/2563eb?text=DOCUMENT\\nFILE&font=Montserrat';
        }
      };
      reader.readAsDataURL(file);
    }
  }

  // 🌟 ฟังก์ชันจัดการอัปโหลดหลายรูปภาพ (Gallery)
  onMultipleImagesSelected(event: any) {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        if (!files[i].type.startsWith('image/')) continue;
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.additionalImages.push(e.target.result);
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(files[i]);
      }
    }
  }

  // 🌟 ฟังก์ชันลบรูปภาพจาก Gallery ตอนกำลังเพิ่ม/แก้ไข
  removeAdditionalImage(index: number) {
    this.additionalImages.splice(index, 1);
  }

  openAddForm() {
    this.isEditMode = false;
    this.editingId = null;
    
    // 🌟 ดึงข้อมูลผู้ใช้ปัจจุบันที่ล็อกอินอยู่
    const currentUser = this.authService.currentUser.value;
    
    this.newProject = { 
      title: '', 
      description: '', 
      imageUrl: '', 
      videoUrl: '', 
      documentUrl: '', 
      categoryId: null, 
      authorName: currentUser ? currentUser.username : '', // 🌟 กำหนดค่าเริ่มต้นเป็น Username ที่ล็อกอิน
      location: '' 
    }; 
    
    this.unifiedMediaUrl = ''; 
    this.additionalImages = []; // เคลียร์รูป Gallery เมื่อเปิดฟอร์มใหม่
    this.showForm = true;
    this.showDetail = false;
    this.showAdminDashboard = false;
  }

  editProject(project: any) {
    this.isEditMode = true;
    this.editingId = project.id;
    this.newProject = { ...project };
    
    // 🌟 โหลดรูป Gallery เดิมมาแสดง
    this.additionalImages = project.images ? project.images.map((img: any) => img.url) : [];

    const existingMedia = project.videoUrl || project.documentUrl || project.imageUrl || '';
    if (existingMedia && !existingMedia.startsWith('data:')) {
      this.unifiedMediaUrl = existingMedia;
    } else {
      this.unifiedMediaUrl = '';
    }
    
    this.showForm = true;
    this.showDetail = false;
    this.showAdminDashboard = false;
    window.scrollTo(0, 0);
  }

  cancelForm() {
    this.showForm = false;
  }

  viewDetail(project: any) {
    this.selectedProject = project;
    this.currentSlideIndex = 0; // 🌟 รีเซ็ตหน้า Slider กลับไปรูปแรกเสมอ
    this.showDetail = true;
    this.showForm = false;
    this.showAdminDashboard = false;
    window.scrollTo(0, 0);
  }

  // 🌟 ฟังก์ชันรวมรูปปก และรูปรอง เข้าด้วยกันเพื่อสร้าง Slider
  get currentDetailImages(): string[] {
    if (!this.selectedProject) return [];
    const images = [];
    if (this.selectedProject.imageUrl && !this.selectedProject.imageUrl.includes('placehold.co')) {
      images.push(this.selectedProject.imageUrl);
    }
    if (this.selectedProject.images && this.selectedProject.images.length > 0) {
      images.push(...this.selectedProject.images.map((img: any) => img.url));
    }
    // ถ้าไม่มีรูปเลยให้ส่ง placeholder ออกไป
    return images.length > 0 ? images : ['https://placehold.co/600x400/e2e8f0/475569?text=No+Image'];
  }

  // 🌟 ฟังก์ชันเลื่อน Slider ไปรูปถัดไป
  nextSlide() {
    if (this.currentSlideIndex < this.currentDetailImages.length - 1) {
      this.currentSlideIndex++;
    } else {
      this.currentSlideIndex = 0;
    }
  }

  // 🌟 ฟังก์ชันเลื่อน Slider ไปรูปก่อนหน้า
  prevSlide() {
    if (this.currentSlideIndex > 0) {
      this.currentSlideIndex--;
    } else {
      this.currentSlideIndex = this.currentDetailImages.length - 1;
    }
  }

  saveProject() {
    if (!this.newProject.title || !this.newProject.categoryId) {
      alert('กรุณากรอกชื่อผลงานและหมวดหมู่ให้ครบถ้วนครับ!'); return;
    }

    // 🌟 เช็คว่าถ้าไม่ใช่หมวดหมู่ 3 (Photo) ให้เคลียร์ Array รูปแกลเลอรีทิ้งก่อนส่งไปหา Backend
    if (Number(this.newProject.categoryId) !== 3) {
      this.additionalImages = [];
    }

    if (this.unifiedMediaUrl) {
      this.newProject.imageUrl = '';
      this.newProject.videoUrl = '';
      this.newProject.documentUrl = '';
      
      const url = this.unifiedMediaUrl;
      const lowerUrl = url.toLowerCase();
      
      if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be') || lowerUrl.endsWith('.mp4')) {
        this.newProject.videoUrl = url;
        
        const ytRegExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(ytRegExp);
        if (match && match[2].length === 11) {
          const ytId = match[2];
          this.newProject.imageUrl = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
        } else {
          this.newProject.imageUrl = 'https://placehold.co/600x400/1e293b/38bdf8?text=VIDEO\\nFILE&font=Montserrat';
        }
        
      } else if (lowerUrl.includes('drive.google.com') || lowerUrl.endsWith('.pdf') || lowerUrl.endsWith('.doc') || lowerUrl.endsWith('.docx')) {
        this.newProject.documentUrl = url;
        this.newProject.imageUrl = 'https://placehold.co/600x400/eff6ff/2563eb?text=DOCUMENT\\nFILE&font=Montserrat';
      } else {
        this.newProject.imageUrl = url;
      }
    }

    const currentUser = this.authService.currentUser.value;

    const payload = {
      title: this.newProject.title,
      description: this.newProject.description,
      imageUrl: this.newProject.imageUrl,
      videoUrl: this.newProject.videoUrl,       
      documentUrl: this.newProject.documentUrl, 
      authorName: currentUser ? currentUser.username : (this.newProject.authorName || 'ไม่ระบุชื่อ'),
      categoryId: Number(this.newProject.categoryId),
      authorId: currentUser ? currentUser.id : null,
      location: this.newProject.location,
      additionalImages: this.additionalImages // 🌟 ส่ง Array รูปภาพแนบไปด้วย
    };

    if (this.isEditMode && this.editingId) {
      this.http.patch(`https://dpg-studio-backend.onrender.com/project/${this.editingId}`, payload).subscribe({
        next: () => { this.fetchProjects(); this.cancelForm(); },
        error: (err) => { console.error(err); alert('❌ แก้ไขข้อมูลไม่ได้!'); }
      });
    } else {
      this.http.post('https://dpg-studio-backend.onrender.com/project', payload).subscribe({
        next: (res: any) => { 
          this.myOwnedProjects.push(res.id);
          localStorage.setItem('my_owned_projects', JSON.stringify(this.myOwnedProjects));
          this.fetchProjects(); 
          this.cancelForm(); 
        },
        error: (err) => { console.error(err); alert('❌ บันทึกไม่ได้!'); }
      });
    }
  }

  deleteProject(id: number, event: Event) {
    event.stopPropagation();
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผลงานชิ้นนี้?')) {
      this.http.delete(`https://dpg-studio-backend.onrender.com/project/${id}`).subscribe({
        next: () => this.fetchProjects(),
        error: () => alert('เกิดข้อผิดพลาดในการลบข้อมูลครับ')
      });
    }
  }

  editProjectFromCard(project: any, event: Event) {
    event.stopPropagation();
    this.editProject(project);
  }

  // 🌟 ฟังก์ชันจัดการ Auth (Login / Register / Logout)
  openLoginModal() {
    this.showLoginModal = true;
    this.isRegisterMode = false; // เปิดมาหน้า Login เสมอ
  }

  closeLoginModal() {
    this.showLoginModal = false;
    this.isRegisterMode = false;
    this.loginData = { username: '', password: '' };
    this.registerData = { username: '', password: '', role: 'CREATOR' };
  }

  toggleAuthMode() {
    this.isRegisterMode = !this.isRegisterMode;
  }

  login() {
    this.authService.login(this.loginData).subscribe({
      next: (res) => {
        alert('เข้าสู่ระบบสำเร็จ!');
        this.closeLoginModal();
      },
      error: (err) => {
        alert('ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง');
      }
    });
  }

  register() {
    if (!this.registerData.username || !this.registerData.password) {
      alert('กรุณากรอกชื่อผู้ใช้งานและรหัสผ่านให้ครบถ้วน!');
      return;
    }

    // 🌟 1. เช็คเงื่อนไข Username (ต้องเป็นตัวอักษรหรือตัวเลขเท่านั้น ห้ามมีอักขระพิเศษและช่องว่าง)
    const usernameRegex = /^[a-zA-Z0-9ก-๙]+$/;
    if (!usernameRegex.test(this.registerData.username)) {
      alert('❌ ชื่อผู้ใช้งานต้องไม่มีอักขระพิเศษหรือเว้นวรรค (ใช้ได้แค่ตัวอักษรและตัวเลขเท่านั้น)');
      return;
    }

    // 🌟 2. เช็คเงื่อนไข Password (ขั้นต่ำ 8 ตัว, มีพิมพ์เล็ก, พิมพ์ใหญ่, อักขระพิเศษ)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passwordRegex.test(this.registerData.password)) {
      alert('❌ รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร, มีตัวพิมพ์เล็ก, ตัวพิมพ์ใหญ่ และอักขระพิเศษอย่างน้อย 1 ตัว');
      return;
    }

    // 🌟 3. บังคับให้ Role เป็น CREATOR เสมอสำหรับผู้สมัครใหม่
    this.registerData.role = 'CREATOR';

    this.authService.register(this.registerData).subscribe({
      next: () => {
        alert('✨ สมัครสมาชิกสำเร็จ! ระบบจะนำคุณไปยังหน้าเข้าสู่ระบบ');
        this.loginData.username = this.registerData.username;
        this.isRegisterMode = false; // สลับกลับไปหน้า Login อัตโนมัติ
      },
      error: (err) => {
        alert(err.error?.message || '❌ ไม่สามารถสมัครสมาชิกได้ (Username อาจถูกใช้ไปแล้ว)');
      }
    });
  }

  logout() {
    this.authService.logout();
    this.showAdminDashboard = false;
    alert('ออกจากระบบแล้ว');
  }

  // 🌟 ฟังก์ชันสำหรับ Admin Dashboard
  openAdminDashboard() {
    this.showAdminDashboard = true;
    this.showForm = false;
    this.showDetail = false;
    this.fetchUsers();
  }

  closeAdminDashboard() {
    this.showAdminDashboard = false;
  }

  fetchUsers() {
    this.http.get<any[]>('https://dpg-studio-backend.onrender.com/auth/users').subscribe({
      next: (data) => {
        this.usersList = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('ไม่สามารถดึงข้อมูลผู้ใช้งานได้', err)
    });
  }

  deleteUserAcc(id: number, username: string) {
    if (confirm(`🚨 คำเตือน: คุณแน่ใจหรือไม่ที่จะแบน/ลบผู้ใช้งาน "${username}" ?\n(ผลงานทั้งหมดของผู้ใช้นี้อาจได้รับผลกระทบ)`)) {
      this.http.delete(`https://dpg-studio-backend.onrender.com/auth/users/${id}`).subscribe({
        next: () => {
          alert('🗑️ ลบผู้ใช้งานออกจากระบบสำเร็จ');
          this.fetchUsers(); // โหลดข้อมูลใหม่
        },
        error: () => alert('❌ เกิดข้อผิดพลาด ไม่สามารถลบผู้ใช้งานได้')
      });
    }
  }

  // 🌟 ฟังก์ชันดึง Location ปัจจุบันของผู้ใช้งาน
  fetchLocation() {
    if (navigator.geolocation) {
      alert('กำลังดึงตำแหน่ง... กรุณารอสักครู่และกดยอมรับให้เบราว์เซอร์เข้าถึง Location นะครับ');
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          // ใช้ API ฟรีของ OpenStreetMap ในการแปลงพิกัด (Lat/Lon) เป็นชื่อเมือง/จังหวัด
          this.http.get<any>(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=th`)
            .subscribe({
              next: (res) => {
                const addr = res.address;
                // พยายามดึงชื่อ จังหวัด, เมือง, หรือ เขต
                const place = addr.province || addr.city || addr.town || addr.county || 'ไม่ทราบตำแหน่ง';
                const country = addr.country || '';
                this.newProject.location = `${place}, ${country}`;
                this.cdr.detectChanges();
              },
              error: () => alert('❌ ไม่สามารถแปลงพิกัดเป็นชื่อสถานที่ได้')
            });
        },
        (error) => {
          alert('❌ ไม่สามารถดึงตำแหน่งได้ กรุณาอนุญาตการเข้าถึง Location ในเบราว์เซอร์ของคุณ หรือพิมพ์ระบุเองครับ');
        }
      );
    } else {
      alert('❌ เบราว์เซอร์ของคุณไม่รองรับการดึงตำแหน่ง');
    }
  }

  // 🌟 ฟังก์ชันเช็คว่าผู้ใช้ปัจจุบันมีสิทธิ์แก้ไข/ลบ ผลงานนี้หรือไม่
  canEditProject(project: any): boolean {
    const currentUser = this.authService.currentUser.value;
    if (!currentUser) return false;
    
    // ให้สิทธิ์แก้ได้ถ้า ID ตรงกับคนสร้าง หรือเป็น ADMIN
    return currentUser.id === project.authorId || currentUser.role === 'ADMIN';
  }
}