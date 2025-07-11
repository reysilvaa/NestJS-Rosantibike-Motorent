export interface Admin {
  id: string;
  username: string;
  password: string;
  nama: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAdminDto {
  username: string;
  password: string;
  nama: string;
}

export interface UpdateAdminDto {
  username?: string;
  password?: string;
  nama?: string;
}
