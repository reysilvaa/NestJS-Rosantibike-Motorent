export default async () => {
  const t = {
    ['./common/enums/status.enum']: await import('./common/enums/status.enum'),
  };
  return {
    '@nestjs/swagger': {
      models: [
        [
          import('./modules/auth/dto/login.dto'),
          {
            LoginDto: {
              username: { required: true, type: () => String },
              password: { required: true, type: () => String },
            },
          },
        ],
        [
          import('./modules/admin/dto/create-admin.dto'),
          {
            CreateAdminDto: {
              username: { required: true, type: () => String },
              password: { required: true, type: () => String, minLength: 6 },
              nama: { required: true, type: () => String },
            },
          },
        ],
        [
          import('./modules/admin/dto/update-admin.dto'),
          {
            UpdateAdminDto: {
              username: { required: false, type: () => String },
              password: { required: false, type: () => String, minLength: 6 },
              nama: { required: false, type: () => String },
            },
          },
        ],
        [
          import('./modules/jenis-motor/dto/create-jenis-motor.dto'),
          {
            CreateJenisMotorDto: {
              merk: { required: true, type: () => String },
              model: { required: true, type: () => String },
              cc: { required: true, type: () => Number, minimum: 50 },
              gambar: { required: false, type: () => String },
            },
          },
        ],
        [
          import('./modules/jenis-motor/dto/update-jenis-motor.dto'),
          {
            UpdateJenisMotorDto: {
              merk: { required: false, type: () => String },
              model: { required: false, type: () => String },
              cc: { required: false, type: () => Number, minimum: 50 },
              gambar: { required: false, type: () => String },
              slug: { required: false, type: () => String },
            },
          },
        ],
        [
          import('./modules/unit-motor/dto/create-unit-motor.dto'),
          {
            CreateUnitMotorDto: {
              jenisId: { required: true, type: () => String, format: 'uuid' },
              platNomor: { required: true, type: () => String },
              hargaSewa: { required: true, type: () => Number, minimum: 0 },
              status: { required: false, enum: t['./common/enums/status.enum'].StatusMotor },
              tahunPembuatan: { required: false, type: () => Number, minimum: 1900 },
            },
          },
        ],
        [
          import('./modules/unit-motor/dto/update-unit-motor.dto'),
          {
            UpdateUnitMotorDto: {
              jenisId: { required: false, type: () => String, format: 'uuid' },
              platNomor: { required: false, type: () => String },
              status: { required: false, enum: t['./common/enums/status.enum'].StatusMotor },
              hargaSewa: { required: false, type: () => Number, minimum: 0 },
              tahunPembuatan: { required: false, type: () => Number, minimum: 1900 },
            },
          },
        ],
        [
          import('./modules/unit-motor/dto/filter-unit-motor.dto'),
          {
            FilterUnitMotorDto: {
              jenisId: { required: false, type: () => String, format: 'uuid' },
              search: { required: false, type: () => String },
              status: { required: false, enum: t['./common/enums/status.enum'].StatusMotor },
              ccMin: { required: false, type: () => Number, minimum: 0 },
              ccMax: { required: false, type: () => Number, maximum: 5000 },
              yearMin: { required: false, type: () => Number, minimum: 1900 },
              yearMax: { required: false, type: () => Number },
              brands: { required: false, type: () => [String] },
            },
          },
        ],
        [
          import('./modules/unit-motor/dto/check-availability.dto'),
          {
            CheckAvailabilityDto: {
              startDate: { required: true, type: () => String },
              endDate: { required: true, type: () => String },
              jenisId: { required: false, type: () => String, format: 'uuid' },
            },
          },
        ],
        [
          import('./modules/transaksi/dto/create-transaksi.dto'),
          {
            CreateTransaksiDto: {
              namaPenyewa: { required: true, type: () => String },
              noWhatsapp: { required: true, type: () => String },
              unitId: { required: true, type: () => String, format: 'uuid' },
              tanggalMulai: { required: true, type: () => String },
              tanggalSelesai: { required: true, type: () => String },
              jamMulai: {
                required: true,
                type: () => String,
                pattern: '/^([01]\\d|2[0-3]):([0-5]\\d)$/',
              },
              jamSelesai: {
                required: true,
                type: () => String,
                pattern: '/^([01]\\d|2[0-3]):([0-5]\\d)$/',
              },
              jasHujan: { required: false, type: () => Number, default: 0, minimum: 0, maximum: 2 },
              helm: { required: false, type: () => Number, default: 0, minimum: 0, maximum: 2 },
              totalBiaya: { required: false, type: () => Number, minimum: 0 },
            },
            CalculatePriceDto: {
              unitId: { required: true, type: () => String, format: 'uuid' },
              tanggalMulai: { required: true, type: () => String },
              tanggalSelesai: { required: true, type: () => String },
              jamMulai: {
                required: true,
                type: () => String,
                pattern: '/^([01]\\d|2[0-3]):([0-5]\\d)$/',
              },
              jamSelesai: {
                required: true,
                type: () => String,
                pattern: '/^([01]\\d|2[0-3]):([0-5]\\d)$/',
              },
              jasHujan: { required: false, type: () => Number, default: 0, minimum: 0, maximum: 2 },
              helm: { required: false, type: () => Number, default: 0, minimum: 0, maximum: 2 },
            },
          },
        ],
        [
          import('./modules/transaksi/dto/update-transaksi.dto'),
          {
            UpdateTransaksiDto: {
              namaPenyewa: { required: false, type: () => String },
              noWhatsapp: { required: false, type: () => String },
              unitId: { required: false, type: () => String, format: 'uuid' },
              tanggalMulai: { required: false, type: () => String },
              tanggalSelesai: { required: false, type: () => String },
              jamMulai: {
                required: false,
                type: () => String,
                pattern: '/^([01]\\d|2[0-3]):([0-5]\\d)$/',
              },
              jamSelesai: {
                required: false,
                type: () => String,
                pattern: '/^([01]\\d|2[0-3]):([0-5]\\d)$/',
              },
              jasHujan: { required: false, type: () => Number, minimum: 0, maximum: 2 },
              helm: { required: false, type: () => Number, minimum: 0, maximum: 2 },
              status: { required: false, enum: t['./common/enums/status.enum'].StatusTransaksi },
              totalBiaya: { required: false, type: () => Number, minimum: 0 },
            },
          },
        ],
        [
          import('./modules/transaksi/dto/filter-transaksi.dto'),
          {
            FilterTransaksiDto: {
              search: { required: false, type: () => String },
              unitId: { required: false, type: () => String, format: 'uuid' },
              startDate: { required: false, type: () => String },
              endDate: { required: false, type: () => String },
              status: { required: false, type: () => Object },
              page: { required: false, type: () => Number, default: 1 },
              limit: { required: false, type: () => Number, default: 10 },
            },
          },
        ],
        [
          import('./modules/blog/dto/create-blog-post.dto'),
          {
            CreateBlogPostDto: {
              judul: { required: true, type: () => String },
              slug: { required: false, type: () => String },
              konten: { required: true, type: () => String },
              tags: { required: false, type: () => [String] },
              metaTitle: { required: false, type: () => String },
              metaDescription: { required: false, type: () => String },
              featuredImage: { required: false, type: () => String },
              status: { required: false, enum: t['./common/enums/status.enum'].StatusArtikel },
            },
          },
        ],
        [
          import('./modules/blog/dto/update-blog-post.dto'),
          {
            UpdateBlogPostDto: {
              judul: { required: false, type: () => String },
              slug: { required: false, type: () => String },
              konten: { required: false, type: () => String },
              tags: { required: false, type: () => [String] },
              metaTitle: { required: false, type: () => String },
              metaDescription: { required: false, type: () => String },
              featuredImage: { required: false, type: () => String },
              thumbnail: { required: false, type: () => String },
              status: { required: false, enum: t['./common/enums/status.enum'].StatusArtikel },
            },
          },
        ],
        [
          import('./modules/blog/dto/filter-blog-post.dto'),
          {
            FilterBlogPostDto: {
              search: { required: false, type: () => String },
              status: { required: false, enum: t['./common/enums/status.enum'].StatusArtikel },
              tagId: { required: false, type: () => String },
              page: { required: false, type: () => Number, default: 1 },
              limit: { required: false, type: () => Number, default: 10 },
            },
          },
        ],
        [
          import('./common/dto/pagination.dto'),
          {
            PaginationDto: {
              page: { required: false, type: () => Number, default: 1, minimum: 1 },
              limit: { required: false, type: () => Number, minimum: 1 },
            },
          },
        ],
        [
          import('./modules/auth/dto/create-auth.dto'),
          { CreateAuthDto: { name: { required: true, type: () => String } } },
        ],
        [import('./modules/auth/dto/update-auth.dto'), { UpdateAuthDto: {} }],
        [
          import('./modules/blog/dto/create-blog.dto'),
          { CreateBlogDto: { name: { required: true, type: () => String } } },
        ],
        [import('./modules/blog/dto/update-blog.dto'), { UpdateBlogDto: {} }],
        [
          import('./modules/redis/dto/create-redis.dto'),
          { CreateRedisDto: { name: { required: true, type: () => String } } },
        ],
        [import('./modules/redis/dto/update-redis.dto'), { UpdateRedisDto: {} }],
        [
          import('./modules/transaksi/dto/transaksi.dto'),
          {
            CreateTransaksiDto: {
              namaPenyewa: { required: true, type: () => String },
              noWhatsapp: { required: true, type: () => String },
              unitId: { required: true, type: () => String, format: 'uuid' },
              tanggalMulai: { required: true, type: () => String },
              tanggalSelesai: { required: true, type: () => String },
              totalBiaya: { required: false, type: () => Number, minimum: 0 },
            },
            UpdateTransaksiDto: {
              namaPenyewa: { required: false, type: () => String },
              noWhatsapp: { required: false, type: () => String },
              unitId: { required: false, type: () => String, format: 'uuid' },
              tanggalMulai: { required: false, type: () => String },
              tanggalSelesai: { required: false, type: () => String },
              status: { required: false, enum: t['./common/enums/status.enum'].StatusTransaksi },
              totalBiaya: { required: false, type: () => Number, minimum: 0 },
            },
            FilterTransaksiDto: {
              search: { required: false, type: () => String },
              unitId: { required: false, type: () => String, format: 'uuid' },
              startDate: { required: false, type: () => String },
              endDate: { required: false, type: () => String },
              status: { required: false, type: () => Object },
              page: { required: true, type: () => Number, default: 1 },
              limit: { required: true, type: () => Number, default: 10 },
            },
          },
        ],
        [
          import('./modules/whatsapp/dto/create-whatsapp.dto'),
          { CreateWhatsappDto: { name: { required: true, type: () => String } } },
        ],
        [import('./modules/whatsapp/dto/update-whatsapp.dto'), { UpdateWhatsappDto: {} }],
      ],
      controllers: [
        [import('./modules/auth/controllers/auth.controller'), { AuthController: { login: {} } }],
        [
          import('./modules/admin/controllers/admin.controller'),
          { AdminController: { debug: {}, create: {}, update: {}, delete: {} } },
        ],
        [
          import('./modules/jenis-motor/controllers/jenis-motor.controller'),
          {
            JenisMotorController: {
              findAll: { type: [Object] },
              findBySlug: {},
              findOne: { type: Object },
              create: {},
              update: {},
              remove: {},
              debugUpload: {},
            },
          },
        ],
        [
          import('./modules/whatsapp/controllers/whatsapp.controller'),
          {
            WhatsappController: {
              getStatus: { type: Object },
              getSessionStatus: {},
              getQrCode: {},
              resetConnection: {},
              logoutSession: {},
              startAllSessions: {},
              getAllSessions: {},
              getChats: {},
              getMessages: {},
              getContact: {},
              sendMessage: {},
              sendToAdmin: {},
              receiveWebhook: { type: Object },
              testMenu: {},
              testConversation: {},
              sendDirectMenu: {},
            },
          },
        ],
        [
          import('./modules/unit-motor/controllers/unit-motor.controller'),
          {
            UnitMotorController: {
              findAll: {},
              getBrands: {},
              checkAvailability: {},
              findBySlug: {},
              findOne: {},
              create: {},
              update: {},
              remove: {},
            },
          },
        ],
        [
          import('./modules/transaksi/controllers/transaksi.controller'),
          {
            TransaksiController: {
              create: {},
              findAll: {},
              getHistory: {},
              searchByPhone: {},
              findOne: {},
              update: {},
              remove: {},
              selesaiSewa: {},
              getLaporanDenda: {},
              getLaporanFasilitas: {},
              calculatePrice: {},
            },
          },
        ],
        [
          import('./modules/blog/controllers/blog.controller'),
          {
            BlogController: {
              getBlogs: {},
              getBlog: { type: Object },
              getBlogBySlug: {},
              createBlog: {},
              updateBlog: {},
              removeBlog: {},
              debugUpload: {},
            },
          },
        ],
        [
          import('./modules/queue/queue.controller'),
          {
            QueueDebugController: {
              getStatus: {},
              getQueueStatus: { type: Object },
              getJobs: { type: Object },
              getJobById: { type: Object },
              retryJob: { type: Object },
              removeJob: { type: Object },
              addJob: { type: Object },
              cleanQueue: { type: Object },
              emptyQueue: { type: Object },
              pauseQueue: { type: Object },
              resumeQueue: { type: Object },
              getDebugWorkers: {},
              startDebugWorker: { type: Object },
              stopDebugWorker: { type: Object },
            },
          },
        ],
        [
          import('./modules/redis/controllers/redis.controller'),
          {
            RedisController: {
              ping: {},
              getInfo: {},
              getKeys: {},
              getKey: {},
              setKey: {},
              deleteKey: {},
            },
          },
        ],
      ],
    },
  };
};
