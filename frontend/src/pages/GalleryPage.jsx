import { useState, useEffect } from "react";
import { Sparkles, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function GalleryPage() {
  const [images, setImages] = useState([]);
  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [salon, setSalon] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [imagesRes, tagsRes, salonRes] = await Promise.all([
        fetch(`${API}/gallery`),
        fetch(`${API}/gallery/tags`),
        fetch(`${API}/salon`)
      ]);
      
      if (imagesRes.ok) {
        setImages(await imagesRes.json());
      }
      if (tagsRes.ok) {
        setTags(await tagsRes.json());
      }
      if (salonRes.ok) {
        setSalon(await salonRes.json());
      }
    } catch (e) {
      console.error("Error fetching gallery:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilteredImages = async (tag) => {
    setLoading(true);
    try {
      const url = tag ? `${API}/gallery?tag=${tag}` : `${API}/gallery`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setImages(data);
      }
    } catch (e) {
      console.error("Error fetching filtered images:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleTagClick = (tag) => {
    const newTag = activeTag === tag ? null : tag;
    setActiveTag(newTag);
    fetchFilteredImages(newTag);
  };

  const capitalizeTag = (tag) => {
    return tag.charAt(0).toUpperCase() + tag.slice(1);
  };

  if (loading && images.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-[#D69E8E] mx-auto animate-pulse" />
          <p className="mt-4 text-[#8C7B75]">Loading gallery...</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="gallery-page" className="py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="font-accent text-xl text-[#9D5C63] mb-2">Our Work</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#4A403A] mb-4">
            Gallery
          </h1>
          <p className="text-[#8C7B75] max-w-2xl mx-auto">
            Browse through our transformations and see the magic we create
          </p>
        </div>

        {/* Filter Tags */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          <button
            onClick={() => handleTagClick(null)}
            className={`tag-pill px-5 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTag === null
                ? "bg-[#D69E8E] text-white"
                : "bg-[#F2E8E4] text-[#4A403A] hover:bg-[#D69E8E] hover:text-white"
            }`}
            data-testid="gallery-filter-all"
          >
            All
          </button>
          {tags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`tag-pill px-5 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTag === tag
                  ? "bg-[#D69E8E] text-white"
                  : "bg-[#F2E8E4] text-[#4A403A] hover:bg-[#D69E8E] hover:text-white"
              }`}
              data-testid={`gallery-filter-${tag}`}
            >
              {capitalizeTag(tag)}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-square bg-[#F2E8E4] rounded-2xl skeleton" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[#8C7B75]">No images found for this category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                className="gallery-item aspect-square relative group cursor-pointer rounded-2xl overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => setSelectedImage(image)}
                data-testid={`gallery-image-${index}`}
              >
                <img
                  src={image.imageUrl}
                  alt={image.caption || "Gallery image"}
                  className="w-full h-full object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end">
                  <div className="p-4 w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {image.caption && (
                      <p className="text-white text-sm font-medium">{image.caption}</p>
                    )}
                    <span className="text-white/80 text-xs capitalize">{image.tag}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Image Modal */}
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
            {selectedImage && (
              <div className="relative">
                <button
                  onClick={() => setSelectedImage(null)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors z-10"
                  data-testid="gallery-modal-close"
                >
                  <X className="w-5 h-5" />
                </button>
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.caption || "Gallery image"}
                  className="w-full max-h-[80vh] object-contain rounded-2xl"
                />
                {selectedImage.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent rounded-b-2xl">
                    <p className="text-white font-medium">{selectedImage.caption}</p>
                    <span className="text-white/70 text-sm capitalize">{selectedImage.tag}</span>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
